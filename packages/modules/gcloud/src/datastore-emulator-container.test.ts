import { Datastore } from "@google-cloud/datastore";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { DatastoreEmulatorContainer, StartedDatastoreEmulatorContainer } from "./datastore-emulator-container";

const IMAGE = getImage(__dirname);

describe("DatastoreEmulatorContainer", { timeout: 240_000 }, () => {
  // datastore4 {
  it("should work using default version", async () => {
    await using datastoreEmulatorContainer = await new DatastoreEmulatorContainer(IMAGE).start();

    await checkDatastore(datastoreEmulatorContainer);
  });
  // }

  // datastore5 {
  it("should work using version 468.0.0", async () => {
    await using datastoreEmulatorContainer = await new DatastoreEmulatorContainer(
      "gcr.io/google.com/cloudsdktool/google-cloud-cli:468.0.0-emulators"
    ).start();

    await checkDatastore(datastoreEmulatorContainer);
  });

  // }

  async function checkDatastore(datastoreEmulatorContainer: StartedDatastoreEmulatorContainer) {
    expect(datastoreEmulatorContainer).toBeDefined();
    const testProjectId = "test-project";
    const testKind = "test-kind";
    const testId = "123";
    const databaseConfig = { projectId: testProjectId, apiEndpoint: datastoreEmulatorContainer.getEmulatorEndpoint() };
    const datastore = new Datastore(databaseConfig);

    const key = datastore.key([testKind, testId]);
    const data = { message: "Hello, Datastore!" };
    await datastore.save({ key, data });
    const [entity] = await datastore.get(key);

    expect(entity).toEqual({ message: "Hello, Datastore!", [Datastore.KEY]: key });
  }
});
