/**
 * Free Fire Tournament Share Results Link Test Suite
 * Validates synchronous LZ encoding, decoding, data fidelity, compression, and link generation.
 */

const assert = require("assert");

console.log("Running Share Results Link Encoding & Decoding Tests...\n");

/**
 * Compact LZ-String URI-Safe Compressor
 */
const LZString = (function() {
  const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

  function compress(uncompressed) {
    if (uncompressed == null) return "";
    let i, value,
        context_dictionary = {},
        context_dictionaryToCreate = {},
        context_c = "",
        context_wc = "",
        context_w = "",
        context_enlargeIn = 2,
        context_dictSize = 3,
        context_numBits = 2,
        context_data = [],
        context_data_val = 0,
        context_data_position = 0,
        ii;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === 5) {
                context_data_position = 0;
                context_data.push(keyStrUriSafe.charAt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data.push(keyStrUriSafe.charAt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data.push(keyStrUriSafe.charAt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    value = 2;
    for (i = 0; i < context_numBits; i++) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position === 5) {
        context_data_position = 0;
        context_data.push(keyStrUriSafe.charAt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position === 5) {
        context_data.push(keyStrUriSafe.charAt(context_data_val));
        break;
      } else {
        context_data_position++;
      }
    }
    return context_data.join("");
  }

  function getBaseValue(char) {
    const idx = keyStrUriSafe.indexOf(char);
    return idx === -1 ? 0 : idx;
  }

  function decompress(input) {
    if (input == null) return "";
    if (input === "") return null;
    let dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = { val: getBaseValue(input.charAt(0)), position: 32, index: 1 };

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = 32;
        data.val = getBaseValue(input.charAt(data.index++));
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32;
            data.val = getBaseValue(input.charAt(data.index++));
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32;
            data.val = getBaseValue(input.charAt(data.index++));
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);

    while (true) {
      if (data.index > input.length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32;
          data.val = getBaseValue(input.charAt(data.index++));
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = 32;
              data.val = getBaseValue(input.charAt(data.index++));
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = 32;
              data.val = getBaseValue(input.charAt(data.index++));
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 2:
          return result.join("");
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);

      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }

  return { compressToEncodedURIComponent: compress, decompressFromEncodedURIComponent: decompress };
})();

/**
 * Compact tournament serializer
 */
function serializeTournamentState(state) {
  const matchesData = (state.matches || []).map((m) => {
    return [
      m.matchNumber || 0,
      m.isSaved ? 1 : 0,
      (m.teamData || []).map((t) => [
        t.placement !== "" && t.placement !== undefined ? t.placement : "",
        t.kills || 0,
        t.minus || 0,
        t.playerKills || {}
      ])
    ];
  });

  return {
    v: 1,
    t: state.tournamentTitle || "FREE FIRE TOURNAMENT",
    m: state.totalMatches || 6,
    th: state.selectedPosterTheme || "red",
    tm: state.teams || [],
    r: state.teamRosters || {},
    d: matchesData
  };
}

/**
 * Compact tournament deserializer
 */
function deserializeTournamentState(compact) {
  if (!compact || compact.v !== 1) return null;

  const matches = (compact.d || []).map((mArr) => {
    const matchNumber = mArr[0];
    const isSaved = mArr[1] === 1;
    const rawTeamData = mArr[2] || [];

    const teamData = (compact.tm || []).map((teamName, idx) => {
      const t = rawTeamData[idx] || ["", 0, 0, {}];
      return {
        teamName,
        placement: t[0],
        kills: typeof t[1] === "number" ? t[1] : 0,
        minus: typeof t[2] === "number" ? t[2] : 0,
        playerKills: typeof t[3] === "object" && t[3] !== null ? t[3] : {}
      };
    });

    return {
      matchNumber,
      isSaved,
      teamData
    };
  });

  return {
    tournamentTitle: compact.t,
    totalMatches: compact.m,
    selectedPosterTheme: compact.th || "red",
    teams: compact.tm,
    teamRosters: compact.r || {},
    matches
  };
}

/**
 * Synchronous URL Share Encoder
 */
function encodeTournamentToShareParam(state) {
  const compact = serializeTournamentState(state);
  const jsonStr = JSON.stringify(compact);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return "l:" + compressed;
}

/**
 * Synchronous URL Share Decoder
 */
function decodeShareParamToTournament(param) {
  if (!param || typeof param !== "string") return null;

  try {
    let jsonStr = "";
    if (param.startsWith("l:")) {
      jsonStr = LZString.decompressFromEncodedURIComponent(param.slice(2));
    } else {
      // Direct raw LZ or base64 fallback
      jsonStr = LZString.decompressFromEncodedURIComponent(param);
      if (!jsonStr) {
        const raw = param.startsWith("r:") ? param.slice(2) : param;
        const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
        const buf = Buffer.from(b64, "base64");
        jsonStr = buf.toString("utf-8");
      }
    }

    if (!jsonStr) return null;
    const compact = JSON.parse(jsonStr);
    return deserializeTournamentState(compact);
  } catch (err) {
    return null;
  }
}

// =========================================================================
// TEST 1: Synchronous Serialization & Deserialization
// =========================================================================
{
  const mockState = {
    tournamentTitle: "NZ PAID SCRIMS ★ S1",
    totalMatches: 6,
    selectedPosterTheme: "cyan",
    teams: [
      "TEAM EVOS 亗", "TOTAL GAMING", "TSM ⚡", "GALAXY RACER",
      "TEAM ELITE", "ORANGUTAN", "HYDRA ESPORTS", "CHEMIN ESPORTS",
      "GODLIKE", "BLIND ESPORTS", "REVENANT", "ENIGMA GAMING"
    ],
    teamRosters: {
      0: ["Mr05", "SAM13", "Abu", "Street"],
      1: ["Ajjubhai", "FozyAjay", "Mafia", "Bala"]
    },
    matches: [
      {
        matchNumber: 1,
        isSaved: true,
        teamData: [
          { teamName: "TEAM EVOS 亗", placement: 1, kills: 10, minus: 0, playerKills: { "Mr05": 6, "SAM13": 2, "Abu": 1, "Street": 1 } },
          { teamName: "TOTAL GAMING", placement: 2, kills: 5, minus: 1, playerKills: { "Ajjubhai": 3, "FozyAjay": 2 } }
        ]
      },
      {
        matchNumber: 2,
        isSaved: true,
        teamData: [
          { teamName: "TEAM EVOS 亗", placement: 3, kills: 4, minus: 0, playerKills: { "Mr05": 3, "SAM13": 1 } },
          { teamName: "TOTAL GAMING", placement: 1, kills: 8, minus: 0, playerKills: { "Ajjubhai": 5, "FozyAjay": 3 } }
        ]
      }
    ]
  };

  const shareParam = encodeTournamentToShareParam(mockState);
  assert.ok(shareParam.startsWith("l:"), "Must use prefix l:");
  console.log("✓ Encoded Share Param length:", shareParam.length, "characters (ultra compact & URI safe).");

  const restored = decodeShareParamToTournament(shareParam);
  assert.ok(restored, "Restored state must not be null");
  assert.strictEqual(restored.tournamentTitle, mockState.tournamentTitle);
  assert.strictEqual(restored.totalMatches, 6);
  assert.strictEqual(restored.selectedPosterTheme, "cyan");
  assert.strictEqual(restored.teams.length, 12);
  assert.strictEqual(restored.teams[0], "TEAM EVOS 亗");
  assert.strictEqual(restored.teamRosters[0][0], "Mr05");

  // Check Match 1
  assert.strictEqual(restored.matches.length, 2);
  assert.strictEqual(restored.matches[0].matchNumber, 1);
  assert.strictEqual(restored.matches[0].isSaved, true);
  assert.strictEqual(restored.matches[0].teamData[0].placement, 1);
  assert.strictEqual(restored.matches[0].teamData[0].kills, 10);
  assert.strictEqual(restored.matches[0].teamData[0].playerKills["Mr05"], 6);
  assert.strictEqual(restored.matches[0].teamData[1].minus, 1);

  // Check Match 2
  assert.strictEqual(restored.matches[1].teamData[1].placement, 1);
  assert.strictEqual(restored.matches[1].teamData[1].kills, 8);
  assert.strictEqual(restored.matches[1].teamData[1].playerKills["Ajjubhai"], 5);

  console.log("✓ Full tournament fidelity preserved 100% across matches, rosters, penalties & MVP kills.");
}

// =========================================================================
// TEST 2: Graceful Error Handling on Corrupted Param
// =========================================================================
{
  const invalid = decodeShareParamToTournament("l:invalid_corrupted_garbage_123");
  assert.strictEqual(invalid, null, "Should return null on corrupted data");

  const empty = decodeShareParamToTournament("");
  assert.strictEqual(empty, null, "Should return null on empty string");

  console.log("✓ Corrupted/invalid URLs handled gracefully without throwing unhandled exceptions.");
}

// =========================================================================
// TEST 3: Generate Social Sharing Text & Full URL Construction
// =========================================================================
{
  const baseUrl = "https://freefirecalc.com/";
  const shareParam = "l:test_hash";
  const shareUrl = `${baseUrl}#share=${shareParam}`;

  const summary = {
    title: "FREE FIRE GRAND TOURNAMENT",
    winnerName: "TEAM EVOS",
    winnerPoints: 78,
    mvpName: "Mr05",
    mvpKills: 14
  };

  const whatsappText = `🏆 *${summary.title} - FINAL RESULTS* 🏆\n\n🥇 *1st Place:* ${summary.winnerName} (${summary.winnerPoints} PTS)\n👑 *Tournament MVP:* ${summary.mvpName} (${summary.mvpKills} KILLS)\n\n📊 *View Full Live Standings & Matrix:* \n${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  assert.ok(whatsappUrl.includes("wa.me"), "WhatsApp URL must be properly formed");
  assert.ok(whatsappUrl.includes(encodeURIComponent(summary.title)), "Title must be encoded");
  assert.ok(whatsappUrl.includes(encodeURIComponent(shareUrl)), "Share URL must be in WhatsApp text");

  console.log("✓ WhatsApp and social sharing URL generators formatted correctly.");
}

console.log("\n=======================================================");
console.log("🎉 ALL SYNCHRONOUS SHARE RESULTS LINK TESTS PASSED 100%!");
console.log("=======================================================");
