# UrboCore Processing
URBO's Processing. This project is the data processing application of URBO solution for smart cities.

| Master | Dev |
|--------|-----|
|[![Build Status](https://jenkins.geographica.gs/buildStatus/icon?job=urbocore-processing/master)](https://jenkins.geographica.gs/job/urbocore-processing/job/master/)|[![Build Status](https://jenkins.geographica.gs/buildStatus/icon?job=urbocore-processing/dev)](https://jenkins.geographica.gs/job/urbocore-processing/job/dev/)|

## Introduction
This is the code repository for URBO Core Processing, the data processing application for the URBO project.

This repository provides the base code for the data processing **tasks** and needs to be complemented with pluggable verticals.


## Requirements
* NodeJS version 6.x or greater.
* Docker version 18.02 or greater.
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
5. Start Processing using docker-compose. The image will be built in case it doesn't exist yet, along with Redis:
```
docker-compose up processing
```

## Notes for developers
The development configurations for the different containers required by processing are defined in the *docker-compose.override.yml* file. By default, docker-compose will override/merge the configuration existing in the *docker-compose.yml* file with the contents of the *.override.yml* file. This means that when you execute `docker-compose up` you will start the development environment by default. You can find more information about how docker-compose allows you to extend configurations [here](https://docs.docker.com/compose/extends/).

If you wish to change/update the configurations you can create a new _docker-compose.*.yml_ file, that file will be ignored by default by git, so you can create as many configurations as you wish.
In order to use these configs you will have to append to your docker-compose commands two `-f` flags. For example:
```
docker-compose -f docker-compose.yml -f docker-compose.example.yml up -d
```
This leads to more difficult to read commands, our recommendation is to create an alias in your shell, let's call it `dcp`:
```
alias dcp="docker-compose -f docker-compose.yml -f docker-compose.example.yml"
```
With this alias you can issue commands faster, the previous example ends up like this:
```
dcp up -d
```
Remember that you can still use other docker-compose commands with this shortcut: `dcp build`, `dcp down` ...

### Managing pluggable verticals
The process of installing a vertical consists in copying the necessary resources into the *verticals* folder inside the container. Both production and development configurations can be modified in order to declare a docker volume and mount the resources.
The *install-vertical* tool is handy if you wish to copy those resources from a directory containing different verticals. Take into account that you will need to install Node.js and the necessary dependencies in your host.

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

You can think of other approaches, such as copying the resources manually (look for the *processing* directory inside each vertical) into one directory and mounting that. Keep in mind that you need to preserve the `index.js` file existing in the verticals folders.

Remember to restart the server in order to apply this changes.

## Testing
To run the tests, just execute:
```
docker-compose run processing npm run-script test
```

## License

UrboCore Processing is licensed under Affero General Public License (GPL) version 3.
