node("docker") {

    currentBuild.result = "SUCCESS"

    try {

        stage "Building"

            checkout scm
            sh "git rev-parse --short HEAD > .git/git_commit"
            sh "git --no-pager show -s --format='%ae' HEAD > .git/git_committer_email"

            workspace = pwd()
            branch_name = "${env.BRANCH_NAME}".replaceAll("/", "_")
            git_commit = readFile(".git/git_commit").replaceAll("\n", "").replaceAll("\r", "")
            build_name = "${branch_name}--${git_commit}"
            job_name = "${env.JOB_NAME}".replaceAll("%2F", "/")
            committer_email = readFile(".git/git_committer_email").replaceAll("\n", "").replaceAll("\r", "")

            echo "Building urbocore-processing/${build_name}"

            sh "cp test/config.test.yml config.yml"
            sh "docker build --pull=true -t geographica/urbo_processing -f Dockerfile.test ."

        stage "Testing"

            // We need tests

            echo "Testing urbocore-processing/${build_name}"

    } catch (error) {

        currentBuild.result = "FAILURE"

        echo "Sending failure mail :("
        emailext subject: "${job_name} - Failure in build #${env.BUILD_NUMBER}", to: "${committer_email}, \$DEFAULT_RECIPIENTS", body: "Check console output at ${env.BUILD_URL} to view the results."

        echo "urbocore-processing/${build_name} failed: ${error}"
        throw error

    } finally {

        stage "Cleaning"

            echo "Cleaning urbocore-processing/${build_name}"

        if (currentBuild.result == "SUCCESS" && ["master", "staging", "dev"].contains(branch_name)) {

            stage "Deploying"

                if (branch_name == "master") {
                    echo "Deploying master ..."
                    sh "ansible urbo-production -a 'sh /data/app/urbo/urbocore-processing/deploy.sh'"

                } else if (branch_name == "dev") {
                    echo "Deploying dev ..."
                    sh "ansible urbo-dev -a 'sh /data/app/urbo/urbocore-processing/deploy.sh'"

                } else {
                    currentBuild.result = "FAILURE"
                    error_message = "Jenkinsfile error, deploying neither master nor staging nor dev"

                    echo "${error_message}"
                    error(error_message)
                }
        }
    }
}
