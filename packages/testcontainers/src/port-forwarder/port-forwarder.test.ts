import { GenericContainer } from "../generic-container/generic-container";
import { Network } from "../network/network";
import { TestContainers } from "../test-containers";
import { RandomPortGenerator } from "../utils/port-generator";
import { createTestServer } from "../utils/test-helper";

describe("PortForwarder", { timeout: 180_000 }, () => {
  const portGen = new RandomPortGenerator();

  it("should expose host ports to the container", async () => {
    const randomPort = await portGen.generatePort();
    await using _ = await createTestServer(randomPort);
    await TestContainers.exposeHostPorts(randomPort);

    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toEqual(expect.stringContaining("hello world"));
  });

  it("should expose host ports to the container with custom network", async () => {
    const randomPort = await portGen.generatePort();
    await using _ = await createTestServer(randomPort);
    await TestContainers.exposeHostPorts(randomPort);

    await using network = await new Network().start();
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .start();

    const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toEqual(expect.stringContaining("hello world"));
  });

  it("should expose host ports to the container with custom network and network alias", async () => {
    const randomPort = await portGen.generatePort();
    await using _ = await createTestServer(randomPort);
    await TestContainers.exposeHostPorts(randomPort);

    await using network = await new Network().start();
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .withNetworkAliases("foo")
      .start();

    const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toEqual(expect.stringContaining("hello world"));
  });
});
