const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Get all Docker containers and their status
async function getDockerContainers() {
  try {
    // Check if Docker is available
    try {
      await execPromise('docker --version');
    } catch (error) {
      console.log('Docker not available or socket not mounted');
      return [];
    }

    // Get all containers (including stopped ones)
    const { stdout } = await execPromise(
      'docker ps -a --format "{{.ID}}|{{.Names}}|{{.State}}|{{.Status}}|{{.Image}}"'
    );

    if (!stdout.trim()) {
      return [];
    }

    const containers = stdout.trim().split('\n').map(line => {
      const [id, name, state, status, image] = line.split('|');
      
      return {
        id: id.trim(),
        name: name.trim(),
        state: state.trim().toLowerCase(),
        status: status.trim(),
        image: image.trim(),
        type: 'docker'
      };
    });

    return containers;
  } catch (error) {
    console.error('Error getting Docker containers:', error.message);
    return [];
  }
}

// Get container stats (CPU, Memory, Disk)
async function getContainerStats(containerId) {
  try {
    // Get CPU and Memory stats
    const { stdout: statsOutput } = await execPromise(
      `docker stats ${containerId} --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}"`
    );

    if (!statsOutput.trim()) {
      return null;
    }

    const [cpu, mem, memUsage] = statsOutput.trim().split('|');
    
    const stats = {
      cpu: parseFloat(cpu.replace('%', '')).toFixed(2),
      memory: parseFloat(mem.replace('%', '')).toFixed(2),
      memoryUsage: memUsage.trim()
    };

    // Get disk usage for the container
    try {
      const { stdout: diskOutput } = await execPromise(
        `docker exec ${containerId} df -h / 2>/dev/null | tail -n 1 | awk '{print $5 "|" $3 "|" $2 "|" $4}'`
      );

      if (diskOutput.trim()) {
        const [diskPerc, diskUsed, diskTotal, diskFree] = diskOutput.trim().split('|');
        stats.disk = parseFloat(diskPerc.replace('%', '')).toFixed(2);
        stats.diskUsed = diskUsed.trim();
        stats.diskTotal = diskTotal.trim();
        stats.diskFree = diskFree.trim();
      } else {
        // Fallback if can't exec into container
        stats.disk = 'N/A';
        stats.diskUsed = 'N/A';
        stats.diskTotal = 'N/A';
        stats.diskFree = 'N/A';
      }
    } catch (diskError) {
      // If we can't get disk stats, mark as N/A
      stats.disk = 'N/A';
      stats.diskUsed = 'N/A';
      stats.diskTotal = 'N/A';
      stats.diskFree = 'N/A';
    }
    
    return stats;
  } catch (error) {
    console.error(`Error getting stats for container ${containerId}:`, error.message);
    return null;
  }
}

// Get detailed info for all running containers
async function monitorDockerContainers() {
  try {
    const containers = await getDockerContainers();
    
    if (containers.length === 0) {
      return [];
    }

    // Get stats for running containers only
    const containersWithStats = await Promise.all(
      containers.map(async (container) => {
        if (container.state === 'running') {
          const stats = await getContainerStats(container.id);
          return { ...container, stats };
        }
        return container;
      })
    );

    return containersWithStats;
  } catch (error) {
    console.error('Error monitoring Docker containers:', error.message);
    return [];
  }
}

// Check for recently crashed/restarted containers
async function getContainerEvents() {
  try {
    // Get container events from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { stdout } = await execPromise(
      `docker events --since="${fiveMinutesAgo}" --filter type=container --filter event=die --filter event=stop --format "{{.Actor.Attributes.name}}|{{.Action}}|{{.Time}}" | tail -10`
    );

    if (!stdout.trim()) {
      return [];
    }

    const events = stdout.trim().split('\n').map(line => {
      const [name, action, timestamp] = line.split('|');
      return {
        containerName: name,
        event: action,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString()
      };
    });

    return events;
  } catch (error) {
    // Events command might fail if no events, that's okay
    return [];
  }
}

module.exports = {
  getDockerContainers,
  getContainerStats,
  monitorDockerContainers,
  getContainerEvents
};





