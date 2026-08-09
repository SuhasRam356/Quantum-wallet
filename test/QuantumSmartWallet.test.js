import { expect } from "chai";
import hre from "hardhat";

describe("QuantumSmartWallet", function () {
  let wallet;
  let owner;
  let otherAccount;

  // Simulate an ML-DSA public key (1952 bytes for ML-DSA-65)
  // In production this comes from @noble/post-quantum; here we use a deterministic mock.
  const mockPqcPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));
  const mockPqcPubKeyHash = hre.ethers.keccak256(mockPqcPubKey);

  beforeEach(async function () {
    [owner, otherAccount] = await hre.ethers.getSigners();
    const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
    wallet = await Wallet.deploy(mockPqcPubKeyHash, owner.address);
    await wallet.waitForDeployment();
  });

  it("Should set the right owner and PQC key hash", async function () {
    expect(await wallet.owner()).to.equal(owner.address);
    expect(await wallet.pqcPubKeyHash()).to.equal(mockPqcPubKeyHash);
  });

  it("Should receive deposits", async function () {
    const depositAmount = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount,
    });
    const balance = await hre.ethers.provider.getBalance(await wallet.getAddress());
    expect(balance).to.equal(depositAmount);
  });

  it("Should execute transaction with a valid PQC public key", async function () {
    const depositAmount = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount,
    });

    const transferAmount = hre.ethers.parseEther("0.5");
    const targetAddress = otherAccount.address;
    const data = "0x";

    const initialBalance = await hre.ethers.provider.getBalance(targetAddress);

    // Pass the real PQC public key — the contract will hash it and verify the commitment
    await wallet.executeTransaction(targetAddress, transferAmount, data, mockPqcPubKey);

    const finalBalance = await hre.ethers.provider.getBalance(targetAddress);
    expect(finalBalance - initialBalance).to.equal(transferAmount);
  });

  it("Should reject transaction with wrong PQC public key", async function () {
    // Generate a different (wrong) public key
    const wrongPqcPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));

    await expect(
      wallet.executeTransaction(otherAccount.address, 0, "0x", wrongPqcPubKey)
    ).to.be.revertedWith("Invalid PQC public key");
  });

  it("Should reject transaction if caller is not the owner (relayer)", async function () {
    await expect(
      wallet.connect(otherAccount).executeTransaction(otherAccount.address, 0, "0x", mockPqcPubKey)
    ).to.be.revertedWith("Only owner/relayer can submit");
  });

  it("Should allow owner to update PQC key hash", async function () {
    const newPubKey = hre.ethers.hexlify(hre.ethers.randomBytes(1952));
    const newHash = hre.ethers.keccak256(newPubKey);

    await wallet.setPqcPublicKeyHash(newHash);
    expect(await wallet.pqcPubKeyHash()).to.equal(newHash);
  });

  it("Should reject non-owner from updating PQC key hash", async function () {
    const newHash = hre.ethers.keccak256(hre.ethers.randomBytes(32));
    await expect(
      wallet.connect(otherAccount).setPqcPublicKeyHash(newHash)
    ).to.be.revertedWith("Only owner can update PQC key");
  });
});

