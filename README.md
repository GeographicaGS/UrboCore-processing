# UrboCore Processing
URBO's Processing. This project is the data processing application of URBO solution for smart cities.

Status **master** branch: [![Build Status](http://jenkins.geographica.gs/buildStatus/icon?job=urbocore-processing/master)](http://jenkins.geographica.gs/job/urbocore-processing/job/master/)

Status **dev** branch: [![Build Status](http://jenkins.geographica.gs/buildStatus/icon?job=urbocore-processing/dev)](http://jenkins.geographica.gs/job/urbocore-processing/job/dev/)

## Introduction
This is the code repository for URBO Core Processing, the data processing application for the URBO project.

This repository provides the base code for the data processing **tasks** and needs to be complemented with pluggable verticals.


## Requirements
* NodeJS version 6.x or greater.
* Docker version 17.06 or greater.
* We recommend using GNU/Linux as server, but is not mandatory.


## Install and run
In order to run this application you will need to install UrboCore Processing along with some pluggable verticals.

### Installing UrboCore Processing
1. Clone this repository
2. Create the config file on `config.yml` taking `config.sample.yml` as template and fill it with the verticals' configuration you need. Don't forget to configure the database and Carto.
3. Install node dependencies with npm:
```
npm install
```
4. Install needed verticals as is explained in the [Managing pluggable verticals](#managing-pluggable-verticals) section.
6. Start Processing using docker-compose. The image will be built in case it doesn't exist yet, along with Redis:
```
docker-compose up processing
```

### Managing pluggable verticals

#### Install verticals
To install or update a vertical you just need to execute:
```
npm run-script install-vertical -- <vertical-source-path> <vertical-name>
```

Remember to restart the server in order to apply this changes.

#### Delete verticals
The same way you can install a new vertical you can delete it too executing:
```
npm run-script delete-vertical -- <vertical-name>
```

Remember to restart the server in order to apply this changes.

## Testing
To run the tests, just execute:
```
docker-compose run processing npm run-script test
```

## License

UrboCore Processing is licensed under Affero General Public License (GPL) version 3.
