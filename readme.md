# dazure-service-bus

A set of functions for accessing Azure Service Bus.

Support for:

- Importing a shared access policy key.
- Generating and re-using (via cache) a shared-access-signature authorization
  header.
- Posting a batch of messages.
- Pulling and then subsequently deleting a message once processed.
- Processing a message queue by providing a handler function.

## Environment variables

You will need to set the following environment variables to run the tests:

- **SBUS_URL** The url to the service bus instance, e.g.
  https://myapp.servicebus.windows.net
- **SBUS_POLICY_NAME** The name of the shared access key, e.g.
  RootManageSharedAccessKey
- **SBUS_POLICY_KEY** The value of the shared access key.

## Commands

Run `deno task test` to test and format.
