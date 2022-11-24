# DAzure-servicebus

A set of functions for accessing Azure Service Bus.

Support for:

- Importing a shared access policy key.
- Generating and re-using (via cache) a shared-access-signature authorization
  header.
- Posting a batch of messages.
- Pulling and then subsequently deleting a message once processed.
- Processing a message queue by providing a handler function.

## Commands

Run `deno task test` to test and format.
