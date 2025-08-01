import { TableClient, TableEntity } from "@azure/data-tables";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { AzuriteContainer } from "./azurite-container";

const IMAGE = getImage(__dirname);

describe("Azurite", { timeout: 240_000 }, () => {
  // uploadAndDownloadBlob {
  it("should upload and download blob with default credentials", async () => {
    await using container = await new AzuriteContainer(IMAGE).start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();
    const blobName = "hello.txt";
    const content = "Hello world!";
    await containerClient.uploadBlockBlob(blobName, content, Buffer.byteLength(content));

    const blobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blobClient.download(0, undefined);

    const readable = downloadResponse.readableStreamBody as NodeJS.ReadableStream;
    expect(readable).toBeTruthy();

    readable.setEncoding("utf8");
    let data = "";
    for await (const chunk of readable) {
      data += chunk;
    }

    expect(data).toBe(content);
  });
  // }

  // sendAndReceiveQueue {
  it("should add to queue with default credentials", async () => {
    await using container = await new AzuriteContainer(IMAGE).start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const serviceClient = QueueServiceClient.fromConnectionString(connectionString);
    const queueName = "test-queue";
    await serviceClient.createQueue(queueName);

    const queueClient = serviceClient.getQueueClient(queueName);

    const message = "Hello world!";
    await queueClient.sendMessage(message);

    const messages = await queueClient.receiveMessages();
    expect(messages.receivedMessageItems).toHaveLength(1);
    expect(messages.receivedMessageItems[0].messageText).toBe(message);
  });
  // }

  // createAndInsertOnTable {
  it("should add to table with default credentials", async () => {
    await using container = await new AzuriteContainer(IMAGE).start();

    const connectionString = container.getConnectionString();
    expect(connectionString).toBeTruthy();

    const tableName = "person";
    const tableClient = TableClient.fromConnectionString(connectionString, tableName, {
      allowInsecureConnection: true,
    });
    await tableClient.createTable();

    const entity: TableEntity<{ name: string }> = {
      partitionKey: "p1",
      rowKey: "r1",
      name: "John Doe",
    };
    await tableClient.createEntity(entity);

    const e1 = await tableClient.listEntities().next();
    expect(e1.value).toBeTruthy();
    expect(e1.value.name).toBe(entity.name);
  });
  // }

  // customCredentials {
  it("should be able to specify accountName and accountKey", async () => {
    const accountName = "test-account";
    // Account key must be base64 encoded
    const accountKey = Buffer.from("test-key").toString("base64");

    await using container = await new AzuriteContainer(IMAGE)
      .withAccountName(accountName)
      .withAccountKey(accountKey)
      .start();

    const credentials = new StorageSharedKeyCredential(accountName, accountKey);
    const serviceClient = new BlobServiceClient(container.getBlobEndpoint(), credentials);

    const blobContainerName = "test";
    const containerClient = serviceClient.getContainerClient(blobContainerName);
    await containerClient.createIfNotExists();

    const blobContainer = await serviceClient.listContainers().next();
    expect(blobContainer.value).toBeTruthy();
    expect(blobContainer.value.name).toBe(blobContainerName);
  });
  // }

  // customPorts {
  it("should be able to specify custom ports", async () => {
    const blobPort = 13000;
    const queuePort = 14000;
    const tablePort = 15000;
    await using container = await new AzuriteContainer(IMAGE)
      .withBlobPort({ container: 10001, host: blobPort })
      .withQueuePort({ container: 10002, host: queuePort })
      .withTablePort({ container: 10003, host: tablePort })
      .start();

    expect(container.getBlobPort()).toBe(blobPort);
    expect(container.getQueuePort()).toBe(queuePort);
    expect(container.getTablePort()).toBe(tablePort);

    const connectionString = container.getConnectionString();
    expect(connectionString).toContain("13000");
    expect(connectionString).toContain("14000");
    expect(connectionString).toContain("15000");

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient("test");
    await containerClient.createIfNotExists();
  });
  // }

  // inMemoryPersistence {
  it("should be able to use in-memory persistence", async () => {
    await using container = await new AzuriteContainer(IMAGE).withInMemoryPersistence().start();
    const blobName = "hello.txt";

    {
      const connectionString = container.getConnectionString();
      expect(connectionString).toBeTruthy();

      const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = serviceClient.getContainerClient("test");
      await containerClient.createIfNotExists();
      const content = "Hello world!";
      await containerClient.uploadBlockBlob(blobName, content, Buffer.byteLength(content));
      const blobClient = containerClient.getBlockBlobClient(blobName);
      const blobExists = await blobClient.exists();
      expect(blobExists).toBeTruthy();
    }

    await container.restart();

    {
      const connectionString = container.getConnectionString();
      expect(connectionString).toBeTruthy();

      const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = serviceClient.getContainerClient("test");
      const blobClient = containerClient.getBlockBlobClient(blobName);
      const blobExistsAfterRestart = await blobClient.exists();
      expect(blobExistsAfterRestart).toBeFalsy();
    }
  });
  // }
});
