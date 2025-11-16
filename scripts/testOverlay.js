#!/usr/bin/env node
/**
 * testOverlay.js
 *
 * Usage:
 *   node scripts/testOverlay.js path/to/step.json [--width=1920] [--height=1080] [--output=overlay-preview.html]
 *
 * Reads a JSON payload describing a guidance step, converts the normalized bbox
 * into pixel coordinates for the requested viewport, and renders a minimal HTML
 * preview that highlights the target region. The circle annotation styling is
 * delegated to `renderer/overlay/drawing/circle.ts`.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { spawn } = require('child_process');

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'overlay-preview.html');
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { _: [] };
  argv.forEach((token) => {
    if (token.startsWith('--')) {
      const [key, value] = token.slice(2).split('=');
      args[key] = value ?? true;
    } else {
      args._.push(token);
    }
  });
  return args;
}

function loadJSON(jsonPath) {
  const absolutePath = path.resolve(process.cwd(), jsonPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${absolutePath}: ${err.message}`);
  }
}

function compileCircleModule() {
  const circlePath = path.resolve(__dirname, '..', 'renderer', 'overlay', 'drawing', 'circle.ts');
  const source = fs.readFileSync(circlePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeNext
    }
  });

  const moduleWrapper = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled.outputText);
  const moduleExports = { exports: {} };
  moduleWrapper(moduleExports.exports, require, moduleExports, circlePath, path.dirname(circlePath));
  if (!moduleExports.exports.circleStyle) {
    throw new Error('circleStyle export not found in circle.ts');
  }
  return moduleExports.exports.circleStyle;
}

function normalizeBoundingBox(step, viewportWidth, viewportHeight) {
  if (!step?.bbox) {
    throw new Error('Input JSON missing "bbox" field.');
  }

  return {
    x: Number(step.bbox.x) * viewportWidth,
    y: Number(step.bbox.y) * viewportHeight,
    width: Number(step.bbox.width) * viewportWidth,
    height: Number(step.bbox.height) * viewportHeight
  };
}

function buildHtmlPreview({ step, bboxPixels, circleStyle, viewportWidth, viewportHeight }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Overlay Preview</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
      }
      .viewport {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        border: 2px solid rgba(123, 220, 255, 0.6);
        pointer-events: none;
      }
      .circle {
        position: fixed;
        left: ${circleStyle.left};
        top: ${circleStyle.top};
        width: ${circleStyle.width};
        height: ${circleStyle.height};
        border-radius: ${circleStyle.borderRadius};
        border: 3px solid #7bdcff;
        box-shadow: 0 0 20px rgba(123, 220, 255, 0.45);
        pointer-events: none;
        z-index: 999999;
      }
    </style>
  </head>
  <body>
    <div class="viewport"></div>
    <div class="circle"></div>
  </body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args._[0]) {
    console.error('Usage: node scripts/testOverlay.js path/to/step.json [--width=1920] [--height=1080] [--output=overlay-preview.html]');
    process.exit(1);
  }

  const step = loadJSON(args._[0]);
  const viewportWidth = Number(args.width || DEFAULT_WIDTH);
  const viewportHeight = Number(args.height || DEFAULT_HEIGHT);
  const outputPath = path.resolve(process.cwd(), args.output || DEFAULT_OUTPUT);

  const circleStyle = compileCircleModule();
  const bboxPixels = normalizeBoundingBox(step, viewportWidth, viewportHeight);
  const circleCss = circleStyle(bboxPixels);
  const html = buildHtmlPreview({
    step,
    bboxPixels,
    circleStyle: circleCss,
    viewportWidth,
    viewportHeight
  });

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`Overlay preview generated at: ${outputPath}`);

  const shouldLaunch =
    args['launch-overlay'] === true ||
    args.launch === true ||
    args.launch === 'overlay' ||
    args['launch-overlay'] === 'true';

  if (shouldLaunch) {
    launchOverlayWindow(outputPath);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function launchOverlayWindow(htmlPath) {
  const electronBin = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  const electronPath = path.join(ROOT, 'node_modules', '.bin', electronBin);

  if (!fs.existsSync(electronPath)) {
    console.error('Electron binary not found. Run `npm install` to ensure dependencies are available.');
    return;
  }

  console.log('Launching Electron overlay window for preview...');
  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    cwd: ROOT,
    env: {
      ...process.env,
      VISOR_OVERLAY_TEST_FILE: htmlPath
    }
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`Overlay preview exited via signal ${signal}`);
    } else {
      console.log(`Overlay preview exited with code ${code}`);
    }
  });
}

