const core = require('@actions/core');
const yaml = require('js-yaml');
const artifact = require('@actions/artifact');
const crypto = require('crypto');
const fs = require('fs');

try {
    const step_name = core.getInput('matrix-step-name');
    const matrix_key = core.getInput('matrix-key');
    const outputs = core.getInput('outputs');

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

    if (!isEmptyInput(outputs)) {
        try {
            yaml.load(outputs);
        }
        catch (error) {
            message = `Outputs should be valid YAML 
---------------------
${outputs}
---------------------`;
            core.setFailed(message);
            return
        }
    }

    const outputs_struct = !isEmptyInput(outputs) ? yaml.load(outputs) : {}

    core.setOutput('result', JSON.stringify(outputs_struct))

    if (!isEmptyInput(outputs)) {
        const artifact_content = isEmptyInput(matrix_key) ? outputs_struct : { matrix_key: outputs_struct }

        fs.writeFileSync("./" + step_name, JSON.stringify(artifact_content));
        const fileBuffer = fs.readFileSync("./" + step_name);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);

        const hex = hashSum.digest('hex');

        const artifactClient = artifact.create()
        const artifactName = hex;
        const files = [
            "./" + step_name,
        ]

        const rootDirectory = '.' // Also possible to use __dirname
        const options = {
            continueOnError: false
        }

        const uploadResponse = artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
    }
} catch (error) {
    core.setFailed(error.message);
}