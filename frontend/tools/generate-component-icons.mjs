#!/usr/bin/env node
// generate-component-icons.mjs
// -----------------------------------------------------------------------------
// Purpose: Build-time generator for the `AWS_ICONS` block of
//   frontend/src/app/shared/component-icon.registry.ts.
//
// It reads 23 AWS Architecture "Service" icons (48px SVGs) from a pinned,
// already-unzipped AWS icon package and emits a deterministic TypeScript
// `const AWS_ICONS: Record<string, string> = { ... }` statement to stdout.
// The block is pasted verbatim into the registry; a provenance task re-runs this
// script and diffs byte-for-byte, so the output MUST be deterministic.
//
// Pinned release: 04302026 (AWS Architecture Icons, release 2026-04-30,
// viewBox="0 0 64 64"). Download URL is pinned in specs/004-aws-component-icons/
// spec.md. The 13.4 MB icon zip is intentionally NOT committed to this repo —
// only this script and the generated block are versioned. A future icon-release
// refresh = download the new package -> rerun this script -> regenerate the
// block -> review the diff.
//
// Runtime: plain Node, ESM, zero dependencies (node:fs + node:path only).
//   Never bundled into the app; build-time tooling only.
//
// Usage:
//   node frontend/tools/generate-component-icons.mjs \
//     "/path/to/Architecture-Service-Icons_04302026"
//
// Transforms applied to each SVG are strictly whitelisted (FR-006 forbids any
// artwork change). See ICON MAPPING and normalizeSvg() below.
// -----------------------------------------------------------------------------

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// aws-* id -> source file (path relative to the package dir arg).
// ORDER IS SIGNIFICANT: this is catalog order and MUST be preserved verbatim in
// the emitted block (deterministic output requirement).
const ICON_MAPPING = [
  ['aws-route-53', 'Arch_Networking-Content-Delivery/48/Arch_Amazon-Route-53_48.svg'],
  ['aws-cloudfront', 'Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg'],
  ['aws-elastic-load-balancing', 'Arch_Networking-Content-Delivery/48/Arch_Elastic-Load-Balancing_48.svg'],
  ['aws-api-gateway', 'Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg'],
  ['aws-waf', 'Arch_Security-Identity/48/Arch_AWS-WAF_48.svg'],
  ['aws-ec2', 'Arch_Compute/48/Arch_Amazon-EC2_48.svg'],
  ['aws-lambda', 'Arch_Compute/48/Arch_AWS-Lambda_48.svg'],
  ['aws-managed-flink', 'Arch_Analytics/48/Arch_Amazon-Managed-Service-for-Apache-Flink_48.svg'],
  ['aws-mwaa', 'Arch_Application-Integration/48/Arch_Amazon-Managed-Workflows-for-Apache-Airflow_48.svg'],
  ['aws-sagemaker-ai', 'Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg'],
  ['aws-bedrock', 'Arch_Artificial-Intelligence/48/Arch_Amazon-Bedrock_48.svg'],
  ['aws-rds', 'Arch_Databases/48/Arch_Amazon-RDS_48.svg'],
  ['aws-dynamodb', 'Arch_Databases/48/Arch_Amazon-DynamoDB_48.svg'],
  ['aws-s3', 'Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg'],
  ['aws-opensearch', 'Arch_Analytics/48/Arch_Amazon-OpenSearch-Service_48.svg'],
  ['aws-timestream', 'Arch_Databases/48/Arch_Amazon-Timestream_48.svg'],
  ['aws-neptune', 'Arch_Databases/48/Arch_Amazon-Neptune_48.svg'],
  ['aws-redshift', 'Arch_Analytics/48/Arch_Amazon-Redshift_48.svg'],
  ['aws-elasticache', 'Arch_Databases/48/Arch_Amazon-ElastiCache_48.svg'],
  ['aws-sqs', 'Arch_Application-Integration/48/Arch_Amazon-Simple-Queue-Service_48.svg'],
  ['aws-sns', 'Arch_Application-Integration/48/Arch_Amazon-Simple-Notification-Service_48.svg'],
  ['aws-cloudwatch', 'Arch_Management-Tools/48/Arch_Amazon-CloudWatch_48.svg'],
  ['aws-cloud-map', 'Arch_Networking-Content-Delivery/48/Arch_AWS-Cloud-Map_48.svg'],
];

function die(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

/**
 * Apply the FR-006 whitelist to one raw SVG file's contents. These are the ONLY
 * permitted changes; paths, fills, viewBox, element order and every other
 * attribute ship byte-identical to the AWS package.
 */
function normalizeSvg(raw, relPath) {
  // Defensive guard (protects future icon-release refreshes): the "strip all
  // ids" transform is only safe because none of these files reference ids via
  // url(#...). If a future package introduces such a reference, refuse rather
  // than silently break the referenced paint/clip/mask.
  if (raw.includes('url(#')) {
    die(`file uses "url(#..." reference; stripping ids would break it: ${relPath}`);
  }

  // Transform 1: strip the XML prolog and any surrounding whitespace by
  // extracting exactly the <svg> element (first "<svg" .. last "</svg>").
  // Leading-whitespace removal is explicitly sanctioned; bounding to the last
  // "</svg>" symmetrically drops any trailing newline so every value ends at
  // "</svg>". All whitespace INTERNAL to the element is preserved verbatim.
  const start = raw.indexOf('<svg');
  if (start === -1) die(`no <svg element found in: ${relPath}`);
  const closeIdx = raw.lastIndexOf('</svg>');
  if (closeIdx === -1) die(`no </svg> close tag found in: ${relPath}`);
  let svg = raw.slice(start, closeIdx + '</svg>'.length);

  // Transform 2: remove the <title>...</title> element entirely, including the
  // newline + indentation of the line it occupied (no blank line left behind).
  svg = svg.replace(/\n?[ \t]*<title>[\s\S]*?<\/title>/, '');

  // Transform 3: remove every id="..." attribute (with its leading space so no
  // double space is left). Safe: no url(#...) / xlink:href / gradient / clipPath
  // / mask references exist in these files (guarded above).
  svg = svg.replace(/ id="[^"]*"/g, '');

  // Transform 4: rewrite the root element's pixel size to the registry's em
  // sizing convention (CSS font-size then controls rendered size; viewBox is
  // untouched so proportions are identical). The package is heterogeneous:
  // older Sketch exports use width="64px" height="64px", newer exports use
  // width="64" height="64" -- both normalize to width="1em" height="1em".
  // We rewrite ONLY the opening <svg ...> tag (up to its first ">"), so the
  // artwork background <rect width="64" height="64"> is never touched. Matching
  // space-preceded attributes ensures "stroke-width" can never be hit.
  const gt = svg.indexOf('>');
  if (gt === -1) die(`malformed <svg> opening tag in: ${relPath}`);
  let head = svg.slice(0, gt + 1);
  const body = svg.slice(gt + 1);
  head = head
    .replace(/ width="[^"]*"/, ' width="1em"')
    .replace(/ height="[^"]*"/, ' height="1em"');
  svg = head + body;

  // ---- Post-transform validation ----------------------------------------
  if (!svg.startsWith('<svg')) die(`normalized value does not start with <svg: ${relPath}`);
  if (!svg.endsWith('</svg>')) die(`normalized value does not end with </svg>: ${relPath}`);
  if (svg.includes('<?xml')) die(`XML prolog survived normalization: ${relPath}`);
  if (svg.includes('<title')) die(`<title> survived normalization: ${relPath}`);
  if (svg.includes(' id=')) die(`an id attribute survived normalization: ${relPath}`);
  if (!svg.includes('width="1em" height="1em"')) {
    die(`root width/height rewrite did not apply: ${relPath}`);
  }
  // Template-literal safety: values are emitted inside backticks, so a literal
  // backtick or a "${" sequence would corrupt the generated TypeScript.
  if (svg.includes('`') || svg.includes('${')) {
    die(`value contains a backtick or "\${" and cannot be template-literal encoded: ${relPath}`);
  }

  return svg;
}

function main() {
  const pkgDir = process.argv[2];
  if (!pkgDir) {
    die('missing argument: path to the unzipped Architecture-Service-Icons_04302026 directory');
  }
  if (!existsSync(pkgDir)) {
    die(`package directory does not exist: ${pkgDir}`);
  }

  // First pass: confirm every mapped source file is present. Report ALL missing
  // files at once (guards future icon-release refreshes).
  const missing = ICON_MAPPING.filter(([, rel]) => !existsSync(join(pkgDir, rel)));
  if (missing.length > 0) {
    process.stderr.write('error: mapped source file(s) missing from package:\n');
    for (const [id, rel] of missing) {
      process.stderr.write(`  ${id} -> ${join(pkgDir, rel)}\n`);
    }
    process.exit(1);
  }

  // Second pass: read + normalize each icon in catalog order.
  const entries = ICON_MAPPING.map(([id, rel]) => {
    const raw = readFileSync(join(pkgDir, rel), 'utf8');
    return [id, normalizeSvg(raw, rel)];
  });

  // Emit the deterministic AWS_ICONS block.
  const lines = [];
  lines.push('// prettier-ignore');
  lines.push('const AWS_ICONS: Record<string, string> = {');
  for (const [id, svg] of entries) {
    lines.push(`  '${id}': \`${svg}\`,`);
  }
  lines.push('};');
  process.stdout.write(lines.join('\n') + '\n');
}

main();
