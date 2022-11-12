# DAzure

A library of functions for accessing Azure resources.

## Resources

The source folder for this repo is divided up into the various Azure resources.
Access the scripts for the specific required resource. For example:

`import { postMessagesToQueue } from
'https://github.com/karlhulme/dazure/src/serviceBus/index.ts

### Service Bus

Support for:

- Importing a shared access policy key
- Generating a shared-access-signature authorization header
- Posting a batch of messages

## Commands

Run `deno task test` to test and format.
