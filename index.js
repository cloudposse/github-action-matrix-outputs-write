const core = require('@actions/core');
const yaml = require('yaml')
const {DefaultArtifactClient} = require('@actions/artifact')
const crypto = require('crypto');
const fs = require('fs');

try {
    const step_name = core.getInput('matrix-step-name');
    const matrix_key = core.getInput('matrix-key');
    const artifact_name = core.getInput('artifact-name');
    const outputs = core.getInput('outputs');

    core.debug("step_name:")
    core.debug(step_name)

    core.debug("matrix_key:")
    core.debug(matrix_key)

    core.debug("artifact_name:")
    core.debug(artifact_name)

    core.debug("outputs:")
    core.debug(outputs)

    function isEmptyInput(value) {
        return value === null || value.trim() === "";
    }

    if (isEmptyInput(step_name) && !isEmptyInput(matrix_key)) {
        core.setFailed("`matrix-step-name` can not be empty when `matrix-key` specified");
        return
    }

    if (!isEmptyInput(step_name) && isEmptyInput(matrix_key)) {
        core.setFailed("`matrix-key` can not be empty when `matrix-step-name` specified");
        return
    }

    const matrix_mode = !isEmptyInput(step_name) && !isEmptyInput(matrix_key)

    if (!isEmptyInput(outputs)) {
        try {
            yaml.parse(outputs)
        }
        catch (error) {
            message = `Outputs should be valid YAML 
---------------------
${outputs}
---------------------
${error}`;
            core.setFailed(message);
            return
        }
    }

    const outputs_struct = !isEmptyInput(outputs) ? yaml.parse(outputs) : {}

    Object.keys(outputs_struct).forEach(function(key, index) {
        core.setOutput(key, outputs_struct[key])
    });

    core.debug("outputs_struct:")
    core.debug(outputs_struct)

    core.debug("JSON.stringify(outputs_struct):")
    core.debug(JSON.stringify(outputs_struct))

    core.setOutput('result', JSON.stringify(outputs_struct))

    if (!isEmptyInput(outputs) && matrix_mode) {
        const artifact_content = isEmptyInput(matrix_key) ? outputs_struct : { [matrix_key]: outputs_struct }

        fs.writeFileSync("./" + step_name, JSON.stringify(artifact_content));
        const fileBuffer = fs.readFileSync("./" + step_name);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);

        const hex = hashSum.digest('hex');

        const artifactClient = new DefaultArtifactClient();
        const artifactName = isEmptyInput(artifact_name) ? hex : artifact_name + matrix_key;
        const files = [
            "./" + step_name,
        ]

        const rootDirectory = '.' // Also possible to use __dirname
        const options = {
            continueOnError: false
        }

        artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
    }
} catch (error) {
    core.setFailed(error.message);
}
