node("docker") {

    currentBuild.result = "SUCCESS"

    try {

        stage "Building"

            checkout scm
            // ${env.GIT_COMMIT} doesn't work D:
            sh "git rev-parse --short HEAD > .git/git_commit"
            sh "git --no-pager show -s --format='%ae' HEAD > .git/git_committer_email"

            workspace = pwd()
            branch_name = "${env.BRANCH_NAME}".replaceAll("/", "_")
            git_commit = readFile(".git/git_commit").replaceAll("\n", "").replaceAll("\r", "")
            build_name = "${branch_name}--${git_commit}"
            job_name = "${env.JOB_NAME}".replaceAll("%2F", "/")
            committer_email = readFile(".git/git_committer_email").replaceAll("\n", "").replaceAll("\r", "")

            echo "Building urbo-processing/${build_name}"

            sh "cp test/config.test.yml config.yml"
            sh "docker build --pull=true -t geographica/urbo_processing -f Dockerfile.test ."
            sh "docker run --name urbo_redis--${build_name} -d redis"

            echo "Creating database"
            sh "docker run -d --name urbo_pgsql--${build_name} -v ${workspace}/db:/api_db -e \"LOCALE=es_ES\" -e \"CREATE_USER=urbo_admin;urbo\" geographica/postgis:awkward_aardvark"

            sleep 20

        stage "Testing"

            echo "Testing urbo-processing/${build_name}"
            sh "docker run -i --rm --name urbo_processing--${build_name} --link urbo_pgsql--${build_name}:postgis --link urbo_redis--${build_name}:redis geographica/urbo_processing npm test"

    } catch (error) {

        currentBuild.result = "FAILURE"

        echo "Sending failure mail :("
        emailext subject: "${job_name} - Failure in build #${env.BUILD_NUMBER}", to: "${committer_email}, \$DEFAULT_RECIPIENTS", body: "Check console output at ${env.BUILD_URL} to view the results."

        echo "urbo-processing/${build_name} failed: ${error}"
        throw error

    } finally {

        stage "Cleaning"

            echo "Cleaning urbo-processing/${build_name}"
            sh "docker rm -f -v urbo_redis--${build_name}"
            sh "docker rm -f -v urbo_pgsql--${build_name}"

        if (currentBuild.result == "SUCCESS" && ["master", "staging", "dev"].contains(branch_name)) {

            stage "Deploying"

                if (branch_name == "master") {
                    echo "Deploying master ..."
                    sh "ansible urbo-production -a 'sh /data/app/urbo/urbo-processing/deploy.sh'"

                } else if (branch_name == "staging") {
                    echo "Deploying staging ..."
                    sh "ansible urbo-staging -a 'sh /data/app/urbo/urbo-processing/deploy.sh'"

                } else if (branch_name == "dev") {
                    echo "Deploying dev ..."
                    sh "ansible urbo-dev -a 'sh /data/app/urbo/urbo-processing/deploy.sh'"

                } else {
                    currentBuild.result = "FAILURE"
                    error_message = "Jenkinsfile error, deploying neither master nor staging nor dev"

                    echo "${error_message}"
                    error(error_message)
                }
        }


    }
}
