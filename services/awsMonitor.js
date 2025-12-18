const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const { NodeSSH } = require('node-ssh');

// Initialize AWS clients
const ec2Client = new EC2Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const cloudWatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Get CloudWatch metric
async function getCloudWatchMetric(instanceId, metricName, unit = 'Percent') {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes
  
  const params = {
    Namespace: 'AWS/EC2',
    MetricName: metricName,
    Dimensions: [
      {
        Name: 'InstanceId',
        Value: instanceId
      }
    ],
    StartTime: startTime,
    EndTime: endTime,
    Period: 300, // 5 minutes
    Statistics: ['Average'],
    Unit: unit
  };
  
  try {
    const command = new GetMetricStatisticsCommand(params);
    const response = await cloudWatchClient.send(command);
    
    if (response.Datapoints && response.Datapoints.length > 0) {
      return response.Datapoints[0].Average;
    }
    return null;
  } catch (error) {
    console.error(`Error getting CloudWatch metric ${metricName}:`, error.message);
    return null;
  }
}

// Get server metrics via SSH
async function getServerMetricsSSH(host, username, privateKey) {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: host,
      username: username,
      privateKey: privateKey
    });
    
    // Get CPU usage
    const cpuResult = await ssh.execCommand("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'");
    const cpuUsage = parseFloat(cpuResult.stdout) || 0;
    
    // Get RAM usage
    const ramResult = await ssh.execCommand("free | grep Mem | awk '{print ($3/$2) * 100.0}'");
    const ramUsage = parseFloat(ramResult.stdout) || 0;
    
    // Get disk usage for /
    const diskResult = await ssh.execCommand("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
    const diskUsage = parseFloat(diskResult.stdout) || 0;
    
    // Get disk space details
    const diskDetailsResult = await ssh.execCommand("df -h / | tail -1 | awk '{print $2,$3,$4}'");
    const diskDetails = diskDetailsResult.stdout.split(' ');
    
    ssh.dispose();
    
    return {
      cpu: cpuUsage.toFixed(2),
      ram: ramUsage.toFixed(2),
      disk: diskUsage.toFixed(2),
      diskTotal: diskDetails[0] || 'N/A',
      diskUsed: diskDetails[1] || 'N/A',
      diskFree: diskDetails[2] || 'N/A',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('SSH connection error:', error.message);
    throw error;
  }
}

// Get EC2 instance details
async function getEC2InstanceDetails(instanceId) {
  try {
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId]
    });
    
    const response = await ec2Client.send(command);
    
    if (response.Reservations && response.Reservations.length > 0) {
      const instance = response.Reservations[0].Instances[0];
      return {
        instanceId: instance.InstanceId,
        state: instance.State.Name,
        type: instance.InstanceType,
        publicIp: instance.PublicIpAddress,
        privateIp: instance.PrivateIpAddress,
        launchTime: instance.LaunchTime,
        name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed'
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting EC2 instance details:', error.message);
    return null;
  }
}

// Monitor server (combines CloudWatch and SSH metrics)
async function monitorServer(server) {
  try {
    const result = {
      id: server.id,
      name: server.name,
      status: 'unknown',
      metrics: null,
      error: null
    };
    
    // If it's an EC2 instance with instance ID
    if (server.instanceId) {
      const details = await getEC2InstanceDetails(server.instanceId);
      if (details) {
        result.details = details;
        result.status = details.state;
      }
    }
    
    // Get metrics via SSH if credentials are provided
    if (server.host && server.username && server.privateKey) {
      try {
        const metrics = await getServerMetricsSSH(
          server.host,
          server.username,
          server.privateKey
        );
        result.metrics = metrics;
        result.status = 'running';
      } catch (sshError) {
        result.error = `SSH Error: ${sshError.message}`;
        result.status = 'unreachable';
      }
    }
    // Otherwise try CloudWatch (requires CloudWatch agent on instance)
    else if (server.instanceId) {
      const cpuMetric = await getCloudWatchMetric(server.instanceId, 'CPUUtilization');
      if (cpuMetric !== null) {
        result.metrics = {
          cpu: cpuMetric.toFixed(2),
          ram: 'N/A (Enable SSH)',
          disk: 'N/A (Enable SSH)',
          diskTotal: 'N/A',
          diskUsed: 'N/A',
          diskFree: 'N/A',
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return result;
  } catch (error) {
    return {
      id: server.id,
      name: server.name,
      status: 'error',
      error: error.message
    };
  }
}

module.exports = {
  monitorServer,
  getEC2InstanceDetails
};

