import { Executed, Deposited, IdentityUpdated, VaultFileAdded, GuardianAdded } from "../generated/QuantumSmartWallet/QuantumSmartWallet"
import { Transaction, Identity, VaultFile, Guardian } from "../generated/schema"

export function handleExecuted(event: Executed): void {
  // Save the outgoing transaction for the relayer (msg.sender)
  let txOutId = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-out";
  let txOut = new Transaction(txOutId);
  txOut.type = "Sent ETH";
  txOut.address = event.transaction.from; // The relayer
  txOut.amount = event.params.value;
  txOut.date = event.block.timestamp;
  txOut.status = "completed";
  txOut.blockNumber = event.block.number;
  txOut.transactionHash = event.transaction.hash;
  txOut.save();

  // Save the incoming transaction for the receiver (target)
  let txInId = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-in";
  let txIn = new Transaction(txInId);
  txIn.type = "Received ETH";
  txIn.address = event.params.target;
  txIn.amount = event.params.value;
  txIn.date = event.block.timestamp;
  txIn.status = "completed";
  txIn.blockNumber = event.block.number;
  txIn.transactionHash = event.transaction.hash;
  txIn.save();
}

export function handleDeposited(event: Deposited): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let tx = new Transaction(id);
  tx.type = "Sent ETH (Deposited)";
  tx.address = event.params.sender;
  tx.amount = event.params.amount;
  tx.date = event.block.timestamp;
  tx.status = "completed";
  tx.blockNumber = event.block.number;
  tx.transactionHash = event.transaction.hash;
  tx.save();
}

export function handleIdentityUpdated(event: IdentityUpdated): void {
  let id = event.params.user;
  let identity = new Identity(id);
  identity.ipfsCid = event.params.ipfsCid;
  identity.updatedAt = event.block.timestamp;
  identity.save();
}

export function handleVaultFileAdded(event: VaultFileAdded): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let file = new VaultFile(id);
  file.user = event.params.user;
  file.ipfsCid = event.params.ipfsCid;
  file.addedAt = event.block.timestamp;
  file.save();
}

export function handleGuardianAdded(event: GuardianAdded): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let guardian = new Guardian(id);
  guardian.user = event.params.user;
  guardian.guardianAddress = event.params.guardian;
  guardian.addedAt = event.block.timestamp;
  guardian.save();
}
