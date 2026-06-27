import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: true,
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function parseRegressionJson(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (Array.isArray(parsed.results)) return parsed;
    } catch {
      // Keep scanning for final JSON payload.
    }
  }

  return { ready: false, results: [] };
}

function printFinalSummary({ regression, unitOk, buildOk, failures }) {
  console.log("InsightFlow Regression");
  console.log("");

  const byId = new Map(regression.results.map((result) => [result.id, result]));
  const displayOrder = [
    ["resume-he", "Resume HE"],
    ["resume-en", "Resume EN"],
    ["contract-he", "Contract HE"],
    ["contract-en", "Contract EN"],
    ["tender", "Tender"],
    ["requirements", "Requirements"],
  ];

  for (const [id, label] of displayOrder) {
    const result = byId.get(id);
    console.log(`${label}: ${result?.pass ? "PASS" : "FAIL"}`);
  }

  console.log("");
  console.log(`Build: ${buildOk ? "PASS" : "FAIL"}`);
  console.log(`Unit tests: ${unitOk ? "PASS" : "FAIL"}`);
  console.log("");

  const ready = unitOk && buildOk && regression.ready;
  console.log(`Ready for human review: ${ready ? "YES" : "NO"}`);

  if (!ready) {
    console.log("");
    console.log("Failures:");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
  }
}

function main() {
  const failures = [];

  const unit = run("node", ["--test", "src/engine/pipelineUtils.test.mjs"]);
  if (!unit.ok) failures.push("Unit tests failed");

  const classifierUnit = run("node", ["--import", "tsx", "--test", "src/classifier/classifier.test.mts"]);
  if (!classifierUnit.ok) failures.push("Classifier unit tests failed");

  const hebrewRtlUnit = run("node", ["--test", "src/extractors/hebrewRtlNormalization.test.mjs"]);
  if (!hebrewRtlUnit.ok) failures.push("Hebrew RTL normalization unit tests failed");

  const regressionExec = run("node", ["--import", "tsx", "tests/regression/runRegression.mjs", "--json"]);
  const regression = parseRegressionJson(regressionExec.stdout);
  if (!regressionExec.ok || !regression.ready) {
    failures.push("Regression tests failed");
    for (const result of regression.results) {
      if (!result.pass) {
        for (const err of result.errors || []) {
          failures.push(`${result.displayName}: ${err}`);
        }
      }
    }
  }

  const build = run("npm", ["run", "build"]);
  if (!build.ok) failures.push("Build failed");

  printFinalSummary({
    regression,
    unitOk: unit.ok && classifierUnit.ok && hebrewRtlUnit.ok,
    buildOk: build.ok,
    failures,
  });

  if (!unit.ok) {
    process.stdout.write("\n[unit test output]\n");
    process.stdout.write(unit.stdout);
    process.stdout.write(unit.stderr);
  }

  if (!classifierUnit.ok) {
    process.stdout.write("\n[classifier test output]\n");
    process.stdout.write(classifierUnit.stdout);
    process.stdout.write(classifierUnit.stderr);
  }

  if (!hebrewRtlUnit.ok) {
    process.stdout.write("\n[hebrew rtl test output]\n");
    process.stdout.write(hebrewRtlUnit.stdout);
    process.stdout.write(hebrewRtlUnit.stderr);
  }

  if (!regressionExec.ok) {
    process.stdout.write("\n[regression output]\n");
    process.stdout.write(regressionExec.stdout);
    process.stdout.write(regressionExec.stderr);
  }

  if (!build.ok) {
    process.stdout.write("\n[build output]\n");
    process.stdout.write(build.stdout);
    process.stdout.write(build.stderr);
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
