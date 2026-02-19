const shell = require('shelljs');

function deployHelmChart(namespace, valuesFile) {
    if (!shell.which('helm')) {
        throw new Error('Helm CLI is required but not installed.');
    }

    const chartPath = process.env.HELM_CHART_PATH;
    const cmd = `helm upgrade --install ${namespace}-chart ${chartPath} -n ${namespace} -f ${valuesFile}`;
    return shell.exec(cmd);
}

module.exports = { deployHelmChart };