const metrics = {
    cpuUsage: [],
    memoryUsage: [],
    dbQueryTimes: [],
    apiResponseTimes: [],
};

function collectCpuUsage(usage) {
    metrics.cpuUsage.push(usage);
}

function collectMemoryUsage(usage) {
    metrics.memoryUsage.push(usage);
}

function recordDbQueryTime(time) {
    metrics.dbQueryTimes.push(time);
}

function recordApiResponseTime(time) {
    metrics.apiResponseTimes.push(time);
}

function getMetrics() {
    return metrics;
}

module.exports = {
    collectCpuUsage,
    collectMemoryUsage,
    recordDbQueryTime,
    recordApiResponseTime,
    getMetrics,
};