import { Environment } from "testcontainers/src/types";
import weaviate from "weaviate-ts-client";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { WeaviateContainer } from "./weaviate-container";

const IMAGE = getImage(__dirname);

describe("WeaviateContainer", { timeout: 100_000 }, () => {
  // connectWeaviate {
  it("should expose ports", async () => {
    await using container = await new WeaviateContainer(IMAGE).start();

    expect(container.getHttpHostAddress()).toBeDefined();
    expect(container.getGrpcHostAddress()).toBeDefined();
  });
  // }

  // connectWeaviateWithClient {
  it("should connect to Weaviate", async () => {
    await using container = await new WeaviateContainer(IMAGE).start();

    const client = weaviate.client({
      scheme: "http",
      host: container.getHttpHostAddress(),
    });

    const res = await client.misc.metaGetter().do();
    expect(res.version).toBeDefined();
  });
  // }

  // connectWeaviateWithModules {
  it("should connect to Weaviate with modules", async () => {
    const enableModules = [
      "backup-filesystem",
      "text2vec-openai",
      "text2vec-cohere",
      "text2vec-huggingface",
      "generative-openai",
    ];
    const environment: Environment = {
      ENABLE_MODULES: enableModules.join(","),
      BACKUP_FILESYSTEM_PATH: "/tmp/backups",
    };
    await using container = await new WeaviateContainer(IMAGE).withEnvironment(environment).start();

    const client = weaviate.client({
      scheme: "http",
      host: container.getHttpHostAddress(),
    });

    const res = await client.misc.metaGetter().do();
    expect(res.version).toBeDefined();
    expect(res.modules).toBeDefined();
    enableModules.forEach((module) => {
      expect(res.modules[module]).toBeDefined();
    });
  });
  // }
});
