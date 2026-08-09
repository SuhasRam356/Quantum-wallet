import { expect } from "chai";
import hre from "hardhat";

describe("QuantumSmartWallet", function () {
  let wallet;
  let owner;
  let otherAccount;
  const pqcPublicKeyMock = "mock_dilithium_public_key_12345";

  beforeEach(async function () {
    [owner, otherAccount] = await hre.ethers.getSigners();
    const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
    wallet = await Wallet.deploy(pqcPublicKeyMock, owner.address);
    await wallet.waitForDeployment();
  });

  it("Should set the right owner and PQC key", async function () {
    expect(await wallet.owner()).to.equal(owner.address);
    expect(await wallet.pqcPublicKey()).to.equal(pqcPublicKeyMock);
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

  it("Should execute transaction with a mocked PQC signature", async function () {
    const depositAmount = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount,
    });

    const transferAmount = hre.ethers.parseEther("0.5");
    const targetAddress = otherAccount.address;
    const data = "0x";
    
    // We send a mock signature bytes, must be > 0 length
    const mockSignature = hre.ethers.hexlify(hre.ethers.toUtf8Bytes("mock_pqc_signature_xyz"));

    // Check balance before
    const initialBalance = await hre.ethers.provider.getBalance(targetAddress);

    await wallet.executeTransaction(targetAddress, transferAmount, data, mockSignature);

    // Check balance after
    const finalBalance = await hre.ethers.provider.getBalance(targetAddress);
    expect(finalBalance - initialBalance).to.equal(transferAmount);
  });

  it("Should reject transaction if caller is not the owner (relayer)", async function () {
    const mockSignature = hre.ethers.hexlify(hre.ethers.toUtf8Bytes("mock_pqc_signature_xyz"));
    await expect(
      wallet.connect(otherAccount).executeTransaction(otherAccount.address, 0, "0x", mockSignature)
    ).to.be.revertedWith("Only owner/relayer can submit");
  });
});
