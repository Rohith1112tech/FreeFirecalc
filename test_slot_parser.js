// Unit Test for Slot List & Lineup Parsing
const assert = require('assert');

function parseSlotList(rawText) {
  if (!rawText || typeof rawText !== "string") return {};

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return {};

  const slots = {};
  let currentSlot = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for explicit "Slot X" or "S X" (e.g. "Slot 1:", "Slot 01 -", "S1:", "Slot 1")
    const explicitSlotMatch = line.match(/^(?:slot|s)\s*(\d+)[\s.:\-–—]*(.*)$/i);
    // Check for "1. Team Name" or "1 - Team Name" only if 1 <= num <= 12 and explicitly formatted
    const numberedSlotMatch = !explicitSlotMatch && line.match(/^(\d+)[\s.:\-–—]+(.*)$/);

    let detectedSlotNum = null;
    let rawTeamName = "";

    if (explicitSlotMatch) {
      detectedSlotNum = parseInt(explicitSlotMatch[1], 10);
      rawTeamName = explicitSlotMatch[2] || "";
    } else if (numberedSlotMatch) {
      const num = parseInt(numberedSlotMatch[1], 10);
      // Only treat as slot header if 1 <= num <= 12 and (either no current slot yet, or num === currentSlot + 1)
      if (num >= 1 && num <= 12 && (currentSlot === null || num === currentSlot + 1 || (currentSlot !== null && slots[currentSlot] && slots[currentSlot].players.length >= 2))) {
        detectedSlotNum = num;
        rawTeamName = numberedSlotMatch[2] || "";
      }
    }

    if (detectedSlotNum !== null && detectedSlotNum >= 1 && detectedSlotNum <= 12) {
      let teamName = rawTeamName.trim();
      // Remove trailing player count e.g. "(3 Players)", "(4 Players)", "[4P]", etc.
      teamName = teamName.replace(/[\(\[\{]\s*\d+\s*(?:players?|p)?\s*[\)\]\}]/gi, "").trim();
      // Remove leading punctuation
      teamName = teamName.replace(/^[:\-–—\s]+/, "").trim();

      currentSlot = detectedSlotNum;
      slots[currentSlot] = {
        teamName: teamName || `TEAM ${String(currentSlot).padStart(2, "0")}`,
        players: []
      };
      continue;
    }

    // Otherwise, if we have an active slot, this line is a player name
    if (currentSlot !== null && slots[currentSlot]) {
      let playerName = line;
      // If line is formatted as "P1: Name" or "Player 1: Name"
      const pMatch = playerName.match(/^(?:p[1-4]|player\s*[1-4])\s*[:.\-–—]\s*(.*)$/i);
      if (pMatch) {
        playerName = pMatch[1].trim();
      }

      if (slots[currentSlot].players.length < 4 && playerName.length > 0) {
        slots[currentSlot].players.push(playerName);
      }
    }
  }

  return slots;
}

console.log("Running Slot List & Lineup Parsing Tests...");

const userSample = `Slot 1: Cg x E-Sports (3 Players)

Dᴀʀᴇ☯Dᴇᴠɪʟ™

15.Crushzz!

15 Wᴏʟғ

Slot 2: T2W ESPORTS 1 (4 Players)

Tɴ ᴠ́ɪɴᴄᴇɴᴢᴏᶠʳ

♛~ᴍᴏᴏɴ|⦅

BKෆமச்சான்ෆ

Ꮗᵰ நிலா

Slot 3: Durex (4 Players)

RFZ ZUKO

SARON 10

BL CʏʙᴇʀGod슸

JENIᴬᵂᴹ ꜞ

Slot 4: Monster Esports (4 Players)

༒︎⚔️கட்டேவன்☂︎༒︎

SG 🅖︎🅤︎🅝︎ᦗ

SAD VILLAN ᦗ

Assᴀssɪɴ G O D π

Slot 5: SeeOurName (4 Players)

ZW FLASH

ZW GTK

TN ÉXE !

chickenᴾᵛᴾᦗ

Slot 6: SOUL REAPERS (4 Players)

FFK࿐FLASH✓

FFK࿐SPIDEY☆࿐

FFK࿐PIKACHU

FFK࿐SNIPER

Slot 7: zoies E-SPORTS (3 Players)

நான் சம்பவம்

Aɴʙᴜ

BLAST 모

Slot 8: MZ.HEROZ (4 Players)

mugulan23451

Mz.ghost02

Mz.TWIN 26

Mz.PRIME

Slot 9: DPI Warriors (4 Players)

Xx!Fixa!

jilla4746U

༒Dxneshᦗ

Tɴ✰KலலாRU

Slot 10: TAZ Elite (4 Players)

TAZ SH4DOW

TG.Rouk24!!

@G.KBABA@

HTG Hasan

Slot 11: TAMIL THUGS (4 Players)

FFK࿐Rᴀᴠɪ

TT ᴘʀɪɴᴄᴇ✓

JV MAN LIVE모

HACrrr !!

Slot 12: OCG ESPORTS (4 Players)

OCG ศหล࿐

VT SARAN ☯

OCG DAMN!

SANTHO X OCG`;

const result = parseSlotList(userSample);

// Verify all 12 slots are detected
assert.strictEqual(Object.keys(result).length, 12, "All 12 slots must be detected");

// Verify Slot 1
assert.strictEqual(result[1].teamName, "Cg x E-Sports");
assert.strictEqual(result[1].players.length, 3);
assert.strictEqual(result[1].players[0], "Dᴀʀᴇ☯Dᴇᴠɪʟ™");
assert.strictEqual(result[1].players[1], "15.Crushzz!");
assert.strictEqual(result[1].players[2], "15 Wᴏʟғ");
console.log("✓ Slot 1 (3 players with unicode symbols & numeric tags) verified.");

// Verify Slot 2 (Tamil characters)
assert.strictEqual(result[2].teamName, "T2W ESPORTS 1");
assert.strictEqual(result[2].players.length, 4);
assert.strictEqual(result[2].players[2], "BKෆமச்சான்ෆ");
assert.strictEqual(result[2].players[3], "Ꮗᵰ நிலா");
console.log("✓ Slot 2 (4 players with Tamil characters & symbols) verified.");

// Verify Slot 7 (3 players)
assert.strictEqual(result[7].teamName, "zoies E-SPORTS");
assert.strictEqual(result[7].players.length, 3);
assert.strictEqual(result[7].players[0], "நான் சம்பவம்");
assert.strictEqual(result[7].players[2], "BLAST 모");
console.log("✓ Slot 7 (3 players with Tamil & Korean glyphs) verified.");

// Verify Slot 12
assert.strictEqual(result[12].teamName, "OCG ESPORTS");
assert.strictEqual(result[12].players.length, 4);
assert.strictEqual(result[12].players[0], "OCG ศหล࿐");
assert.strictEqual(result[12].players[3], "SANTHO X OCG");
console.log("✓ Slot 12 (4 players with Thai & gamer glyphs) verified.");

console.log("\n=======================================================");
console.log("🎉 ALL SLOT LIST PARSER TESTS PASSED 100%!");
console.log("=======================================================");
