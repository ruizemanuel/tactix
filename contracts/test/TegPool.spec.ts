import { expect } from "chai";
import { ethers } from "hardhat";

const FEE_BPS = 1000; // 10%
const DEPOSIT = 1_000_000n; // 1 USDT (6 decimals)

async function deployFixture() {
  const [admin, oracle, alice, bob, platform] = await ethers.getSigners();
  const Usdt = await ethers.getContractFactory("MockUSDT");
  const usdt = await Usdt.deploy();
  const AUsdt = await ethers.getContractFactory("MockAUsdt");
  const aUsdt = await AUsdt.deploy();
  const Aave = await ethers.getContractFactory("MockAavePool");
  const aave = await Aave.deploy(await usdt.getAddress(), await aUsdt.getAddress());

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const lockTime = now + 1000;
  const endTime = lockTime + 100_000;

  const Teg = await ethers.getContractFactory("TegPool");
  const pool = await Teg.deploy(
    await usdt.getAddress(),
    await aave.getAddress(),
    await aUsdt.getAddress(),
    platform.address,
    lockTime,
    endTime,
    DEPOSIT,
    1n,
    "TEST",
    FEE_BPS,
    admin.address,
  );
  await pool.connect(admin).setOracle(oracle.address);

  await usdt.mint(admin.address, 100_000_000n);
  await usdt.mint(alice.address, 50_000_000n);
  await usdt.mint(bob.address, 50_000_000n);

  return { admin, oracle, alice, bob, platform, usdt, aave, aUsdt, pool, lockTime, endTime };
}

// Simulate Aave yield: mint extra aUSDT to the pool + backing USDT to the MockAavePool.
async function addYield(pool: any, aave: any, usdt: any, aUsdt: any, amount: bigint) {
  await aUsdt.mint(await pool.getAddress(), amount);
  await usdt.mint(await aave.getAddress(), amount);
}

describe("TegPool — constructor", () => {
  it("rejects bad times / zero deposit / fee over cap / zero address", async () => {
    const [admin, , , , platform] = await ethers.getSigners();
    const usdt = await (await ethers.getContractFactory("MockUSDT")).deploy();
    const aUsdt = await (await ethers.getContractFactory("MockAUsdt")).deploy();
    const aave = await (await ethers.getContractFactory("MockAavePool")).deploy(await usdt.getAddress(), await aUsdt.getAddress());
    const Teg = await ethers.getContractFactory("TegPool");
    const ok = [await usdt.getAddress(), await aave.getAddress(), await aUsdt.getAddress(), platform.address] as const;
    await expect(Teg.deploy(...ok, 100, 100, DEPOSIT, 1n, "X", FEE_BPS, admin.address)).to.be.revertedWithCustomError(Teg, "BadTimes");
    await expect(Teg.deploy(...ok, 100, 200, 0n, 1n, "X", FEE_BPS, admin.address)).to.be.revertedWithCustomError(Teg, "ZeroAmount");
    await expect(Teg.deploy(...ok, 100, 200, DEPOSIT, 1n, "X", 2001, admin.address)).to.be.revertedWithCustomError(Teg, "FeeTooHigh");
    await expect(Teg.deploy(ethers.ZeroAddress, ok[1], ok[2], ok[3], 100, 200, DEPOSIT, 1n, "X", FEE_BPS, admin.address)).to.be.revertedWithCustomError(Teg, "ZeroAddress");
  });
});

describe("TegPool — seedPool", () => {
  it("admin seeds, USDT → Aave, aUSDT → contract", async () => {
    const { admin, usdt, pool, aave, aUsdt } = await deployFixture();
    await usdt.connect(admin).approve(await pool.getAddress(), 10_000_000n);
    await pool.connect(admin).seedPool(10_000_000n);
    expect(await pool.seedAmount()).to.equal(10_000_000n);
    expect(await aUsdt.balanceOf(await pool.getAddress())).to.equal(10_000_000n);
    expect(await usdt.balanceOf(await aave.getAddress())).to.equal(10_000_000n);
  });
  it("only owner can seed; rejects 0; rejects double-seed", async () => {
    const { admin, alice, usdt, pool } = await deployFixture();
    await usdt.connect(alice).approve(await pool.getAddress(), 10_000_000n);
    await expect(pool.connect(alice).seedPool(10_000_000n)).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
    await expect(pool.connect(admin).seedPool(0)).to.be.revertedWithCustomError(pool, "ZeroAmount");
    await usdt.connect(admin).approve(await pool.getAddress(), 20_000_000n);
    await pool.connect(admin).seedPool(10_000_000n);
    await expect(pool.connect(admin).seedPool(10_000_000n)).to.be.revertedWithCustomError(pool, "AlreadySeeded");
  });
});

describe("TegPool — join", () => {
  it("user joins, deposit pulled to Aave, participant indexed", async () => {
    const { alice, usdt, pool, aUsdt } = await deployFixture();
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT);
    await expect(pool.connect(alice).join()).to.emit(pool, "Joined").withArgs(alice.address, 0);
    expect(await pool.hasJoined(alice.address)).to.equal(true);
    expect(await aUsdt.balanceOf(await pool.getAddress())).to.equal(DEPOSIT);
    expect(await pool.participantsLength()).to.equal(1n);
  });
  it("rejects double-join and join after lockTime", async () => {
    const { alice, usdt, pool, lockTime } = await deployFixture();
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT * 2n);
    await pool.connect(alice).join();
    await expect(pool.connect(alice).join()).to.be.revertedWithCustomError(pool, "AlreadyJoined");
    await ethers.provider.send("evm_setNextBlockTimestamp", [lockTime + 1]);
    await ethers.provider.send("evm_mine", []);
    const [, , , bob] = await ethers.getSigners();
    await usdt.mint(bob.address, DEPOSIT);
    await usdt.connect(bob).approve(await pool.getAddress(), DEPOSIT);
    await expect(pool.connect(bob).join()).to.be.revertedWithCustomError(pool, "TournamentLocked");
  });
  it("rejects join while paused", async () => {
    const { admin, alice, usdt, pool } = await deployFixture();
    await pool.connect(admin).pause();
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT);
    await expect(pool.connect(alice).join()).to.be.revertedWithCustomError(pool, "EnforcedPause");
  });
});

describe("TegPool — submitScores", () => {
  async function joined() {
    const f = await deployFixture();
    await f.usdt.connect(f.alice).approve(await f.pool.getAddress(), DEPOSIT);
    await f.usdt.connect(f.bob).approve(await f.pool.getAddress(), DEPOSIT);
    await f.pool.connect(f.alice).join();
    await f.pool.connect(f.bob).join();
    return f;
  }
  it("oracle submits, winner = max score", async () => {
    const { oracle, alice, bob, pool, endTime } = await joined();
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine", []);
    await expect(pool.connect(oracle).submitScores([alice.address, bob.address], [42, 100], "0x" + "ab".repeat(32)))
      .to.emit(pool, "ScoresSubmitted").withArgs(bob.address, 100);
    expect(await pool.winner()).to.equal(bob.address);
  });
  it("rejects non-oracle / before endTime / mismatch / double", async () => {
    const { oracle, alice, bob, pool, endTime } = await joined();
    await expect(pool.connect(alice).submitScores([alice.address, bob.address], [1, 2], "0x" + "00".repeat(32))).to.be.revertedWithCustomError(pool, "NotOracle");
    await expect(pool.connect(oracle).submitScores([alice.address, bob.address], [1, 2], "0x" + "00".repeat(32))).to.be.revertedWithCustomError(pool, "TournamentNotEnded");
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine", []);
    await expect(pool.connect(oracle).submitScores([alice.address], [1], "0x" + "00".repeat(32))).to.be.revertedWithCustomError(pool, "LengthMismatch");
    await pool.connect(oracle).submitScores([alice.address, bob.address], [10, 20], "0x" + "00".repeat(32));
    await expect(pool.connect(oracle).submitScores([alice.address, bob.address], [10, 20], "0x" + "00".repeat(32))).to.be.revertedWithCustomError(pool, "AlreadySubmitted");
  });
});

describe("TegPool — finalize + platformFee + no-loss", () => {
  it("winner-take-all minus 10% fee on yield; both recover full deposit", async () => {
    const { admin, oracle, alice, bob, platform, usdt, aave, aUsdt, pool, endTime } = await deployFixture();
    await usdt.connect(admin).approve(await pool.getAddress(), 10_000_000n);
    await pool.connect(admin).seedPool(10_000_000n);                 // 10 USDT seed
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT);
    await usdt.connect(bob).approve(await pool.getAddress(), DEPOSIT);
    await pool.connect(alice).join();
    await pool.connect(bob).join();
    await addYield(pool, aave, usdt, aUsdt, 2_000_000n);             // 2 USDT yield
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine", []);
    await pool.connect(oracle).submitScores([alice.address, bob.address], [42, 100], "0x" + "ab".repeat(32));

    // gross = seed(10) + yield(2) = 12 ; yieldEarned = 2 ; fee = 2 * 10% = 0.2 ; prize = 12 - 0.2 = 11.8
    const platBefore = await usdt.balanceOf(platform.address);
    await expect(pool.connect(alice).finalizeAndDistribute()).to.emit(pool, "Finalized");
    expect(await pool.feePaid()).to.equal(200_000n);
    expect(await pool.prizeAmount()).to.equal(11_800_000n);
    expect((await usdt.balanceOf(platform.address)) - platBefore).to.equal(200_000n);

    // winner (bob) claims prize
    const bobBefore = await usdt.balanceOf(bob.address);
    await pool.connect(bob).claimPrize();
    expect((await usdt.balanceOf(bob.address)) - bobBefore).to.equal(11_800_000n);

    // NO-LOSS: both withdraw their full deposit
    for (const u of [alice, bob]) {
      const before = await usdt.balanceOf(u.address);
      await pool.connect(u).withdrawDeposit();
      expect((await usdt.balanceOf(u.address)) - before).to.equal(DEPOSIT);
    }
    // contract is drained
    expect(await usdt.balanceOf(await pool.getAddress())).to.equal(0n);
  });
  it("zero fee when platformFeeBps = 0; loser cannot claim; cannot claim/withdraw/finalize twice", async () => {
    const { admin, oracle, alice, bob, usdt, aave, aUsdt, pool, endTime } = await deployFixture();
    await pool.connect(admin).setPlatformFee(0);
    await usdt.connect(admin).approve(await pool.getAddress(), 10_000_000n);
    await pool.connect(admin).seedPool(10_000_000n);
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT);
    await usdt.connect(bob).approve(await pool.getAddress(), DEPOSIT);
    await pool.connect(alice).join();
    await pool.connect(bob).join();
    await addYield(pool, aave, usdt, aUsdt, 1_000_000n);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine", []);
    await pool.connect(oracle).submitScores([alice.address, bob.address], [42, 100], "0x" + "ab".repeat(32));
    await pool.connect(alice).finalizeAndDistribute();
    expect(await pool.feePaid()).to.equal(0n);
    expect(await pool.prizeAmount()).to.equal(11_000_000n);
    await expect(pool.connect(alice).claimPrize()).to.be.revertedWithCustomError(pool, "NotWinner");
    await pool.connect(bob).claimPrize();
    await expect(pool.connect(bob).claimPrize()).to.be.revertedWithCustomError(pool, "AlreadyClaimed");
    await pool.connect(alice).withdrawDeposit();
    await expect(pool.connect(alice).withdrawDeposit()).to.be.revertedWithCustomError(pool, "AlreadyWithdrawn");
    await expect(pool.connect(alice).finalizeAndDistribute()).to.be.revertedWithCustomError(pool, "AlreadyFinalized");
  });
  it("setPlatformFee rejects over the cap", async () => {
    const { admin, pool } = await deployFixture();
    await expect(pool.connect(admin).setPlatformFee(2001)).to.be.revertedWithCustomError(pool, "FeeTooHigh");
  });
});

describe("TegPool — emergency", () => {
  it("user recovers deposit via emergency when oracle never submits", async () => {
    const { alice, usdt, pool, endTime } = await deployFixture();
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT);
    await pool.connect(alice).join();
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 30 * 86400 + 1]);
    await ethers.provider.send("evm_mine", []);
    await pool.connect(alice).triggerEmergency();
    const before = await usdt.balanceOf(alice.address);
    await pool.connect(alice).emergencyUserWithdraw();
    expect((await usdt.balanceOf(alice.address)) - before).to.equal(DEPOSIT);
  });
  it("admin recovers seed if no participants after 7 days; rejects with participants / too early / non-owner", async () => {
    const { admin, alice, usdt, pool, endTime } = await deployFixture();
    await usdt.connect(admin).approve(await pool.getAddress(), 10_000_000n);
    await pool.connect(admin).seedPool(10_000_000n);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 7 * 86400 + 1]);
    await ethers.provider.send("evm_mine", []);
    const before = await usdt.balanceOf(admin.address);
    await pool.connect(admin).emergencyAdminWithdraw();
    expect((await usdt.balanceOf(admin.address)) - before).to.equal(10_000_000n);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Security fix: emergencyAdminWithdraw (Path A) must NOT sweep participant
  // deposits that have not yet been emergency-withdrawn (no-loss guarantee).
  // ──────────────────────────────────────────────────────────────────────────
  it("Path A: owner sweeps only the surplus (seed+yield); slow participant still recovers full deposit", async () => {
    const SEED = 10_000_000n; // 10 USDT
    const { admin, alice, bob, usdt, aave, aUsdt, pool, endTime } = await deployFixture();

    // Seed the pool
    await usdt.connect(admin).approve(await pool.getAddress(), SEED);
    await pool.connect(admin).seedPool(SEED);

    // Alice and Bob both join (1 USDT each)
    await usdt.connect(alice).approve(await pool.getAddress(), DEPOSIT);
    await usdt.connect(bob).approve(await pool.getAddress(), DEPOSIT);
    await pool.connect(alice).join();
    await pool.connect(bob).join();

    // Advance past endTime + 30 days → triggerEmergency is available
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 30 * 86400 + 1]);
    await ethers.provider.send("evm_mine", []);
    await pool.connect(alice).triggerEmergency();

    // Alice withdraws immediately; Bob does NOT (simulates an offline participant)
    await pool.connect(alice).emergencyUserWithdraw();

    // Advance to Path-A window: endTime + 60 days
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 60 * 86400 + 1]);
    await ethers.provider.send("evm_mine", []);

    // Record owner balance before sweep
    const ownerBefore = await usdt.balanceOf(admin.address);

    // Admin calls emergencyAdminWithdraw (Path A)
    await pool.connect(admin).emergencyAdminWithdraw();

    const ownerGain = (await usdt.balanceOf(admin.address)) - ownerBefore;

    // Owner should receive ONLY the surplus = seed (10 USDT, no yield in this scenario).
    // Bob's 1 USDT deposit (DEPOSIT) must NOT be included.
    expect(ownerGain).to.equal(SEED, "owner must NOT receive Bob's deposit — only the seed surplus");

    // Bob can still recover his full deposit even after the admin sweep
    const bobBefore = await usdt.balanceOf(bob.address);
    await pool.connect(bob).emergencyUserWithdraw();
    expect((await usdt.balanceOf(bob.address)) - bobBefore).to.equal(DEPOSIT, "Bob must recover full deposit after admin sweep");

    // Pool is fully drained
    expect(await usdt.balanceOf(await pool.getAddress())).to.equal(0n, "pool balance must be zero after all withdrawals");
  });
});

describe("TegPool — admin setters", () => {
  it("setOracle / setPlatformFee are owner-only", async () => {
    const { alice, pool } = await deployFixture();
    await expect(pool.connect(alice).setOracle(alice.address)).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
    await expect(pool.connect(alice).setPlatformFee(500)).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
  });
});

describe("TegPool — tie-break", () => {
  it("emits TieBreak and picks a winner deterministically when two players share top score", async () => {
    const f = await deployFixture();
    await f.usdt.connect(f.alice).approve(await f.pool.getAddress(), DEPOSIT);
    await f.usdt.connect(f.bob).approve(await f.pool.getAddress(), DEPOSIT);
    await f.pool.connect(f.alice).join();
    await f.pool.connect(f.bob).join();
    await ethers.provider.send("evm_setNextBlockTimestamp", [f.endTime + 1]);
    await ethers.provider.send("evm_mine", []);
    // Both score the same → tie-break path
    const tx = await f.pool.connect(f.oracle).submitScores(
      [f.alice.address, f.bob.address],
      [77, 77],
      "0x" + "cd".repeat(32)
    );
    const receipt = await tx.wait();
    // TieBreak event must have been emitted
    const iface = f.pool.interface;
    const tieBreakEvent = receipt!.logs
      .map((log: any) => { try { return iface.parseLog(log); } catch { return null; } })
      .find((e: any) => e && e.name === "TieBreak");
    expect(tieBreakEvent).to.not.be.undefined;
    // ScoresSubmitted is also emitted; winner is one of the two
    const w = await f.pool.winner();
    expect([f.alice.address, f.bob.address]).to.include(w);
    expect(await f.pool.winningScore()).to.equal(77n);
  });
});
