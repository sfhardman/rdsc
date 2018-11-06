# RDSC - REST Desired State Configuration tool
RDSC is a tool to allow for declarative / desired state configuration of systems with a REST configuration API.  It is intended for use standalone or in conjunction with a configuration management tool like Puppet.

RDSC takes a YAML schema file defining the configuration API and a YAML desired state file describing the entities that should exist (or be absent), and ensures the target system is in the desired state.

Currently there are built in schema files for configuration of [Kong](https://konghq.com/kong-community-edition/) and [Azure Active Directory](https://msdn.microsoft.com/en-us/library/azure/ad/graph/api/api-catalog).

## Installation
    npm install -g rdsc

or skip installation and run using [npx](https://www.npmjs.com/package/npx)

## Usage
    Usage: rdsc [options]

    Options:
      -s, --schema [schema-name]               Built in schema to use
      -f, --schema-file [schema-file-path]     Arbitrary schema file to use
      -d, --desired <desired-state-file-path>  Desired state YAML file
      -t, --target <target-base-url>           Target base URL
      -c, --test-for-changes                   If there are changes to be made exit with code 1, otherwise exit with code 0
      -v, --verbosity <verbosity-level>        Logging level (ERROR|WARN|INFO|DEBUG|TRACE)
      -H, --header [header]                    Headers to pass to the API (e.g. for authentication) (default: [])
      -h, --help                               output usage information

## Examples
View the *examples* folder in the source code for desired state examples, and the *schema* folder for example schemas.

## Desired State File Format
The desired state file is a YAML file containing an array of entities

    - type: typeName
      # typeName is the name of an entity type defined in the schema file
      absent: false
      # absent is optional and defaults to false
      # if true RDSC will try to ensure the entity is not present in the target system
      properties:
        # properties is a hash of properties that the entity should have in the target system
        # all properties are passed through to the target system REST API on creating or updating entities
        someProperty: someValue
        someComplexProperty:
          someOtherProperty: someOtherValue
      children:
      # children is optional and holds an array of entities that are dependent on this parent entity
        - type: childTypeName
          absent: false
          properties:
            myProperty: myPropValue
          children: []
          # children can be nested indefinitely

## Schema File Format
The schema file is a YAML file defining how to ensure that the target system matches the desired state file.

    garage:
    # a hash key in the root corresponds to an entity type
      keys:
      # keys is an array of property names in the entity that will be available to use in substitutions
        - garageId
        - garageName
      actions:
      # actions is a hash of the CRUD actions that are available for the entity
        add:
            url: /garages/
            # url is the URL in the target system's REST API to call for the action
            method: POST
            # method is optional and defaults to POST
        update:
            url: /garages/{garage.garageId}
            # the part in curly brackets is a substitution taking the garageId property of the garage entity
            method: PUT
            # method is optional and defaults to PATCH
        delete:
            url: /garages/{garage.garageId}
            method: DELETE
            # method is optional and defaults to DELETE
        getOne:
            # getOne returns a single entity from the target system REST API
            # either getOne or getList is required
            url: /garages/{garage.garageId}
            method: GET
            # method is optional and defaults to GET
    cars:
      keys: 
        - carId
        - plateNumber         
      injectDesiredStateProps:
      # injectDesiredStateProps (optional) adds properties to the entity desired state from the parent entities
        garage:
          garageId: '{garage.garageId}'
          # this example adds a property garage.garageId to the desired state from the parent entity
      ignoreMismatchedPropsForUpdate:
      # ignoreMismatchedPropsForUpdate (optional) is an array of properties that are write-only
      # so should not trigger an update if not matching desired state
        - PINNumber
      actions:
        add:
          url: /garages/{garage.garageId}/cars
        update:
          url: /garages/{garage.garageId}/cars/{car.carId}
          method: PUT      
        getList:
          # the getList URL returns an array of candidate entities which MAY match the desired state entity
          url: /cars
          itemsProp: data
          # itemsProp is the property of the JSON API response to look in for the candidate entity array
          # Optional, and defaults to expecting an array in the root of the response
          matchOn:
            # matchOn provides matching criteria for finding a candidate in the getList result that matches the desired entity
            plateNumber: '{car.plateNumber}'
            garage: 
              garageId: '{garage.garagedId}'
        delete: 
          url: /garages/{garage.garageId}/cars/{car.carId}