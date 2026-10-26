export const styles = `
  :host {
    all: initial;
    color-scheme: light;
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; }
  button, input, select, textarea { font: inherit; }

  .db-launcher-wrap {
    bottom: 24px;
    position: fixed;
    right: 24px;
    z-index: 2147483640;
  }
  .db-launcher-row { display: flex; gap: 7px; justify-content: flex-end; }
  .db-launcher {
    align-items: center;
    background: #063d4d;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 999px;
    box-shadow: 0 14px 36px rgba(3, 28, 36, .3);
    color: #fff;
    cursor: pointer;
    display: flex;
    font-size: 14px;
    font-weight: 750;
    gap: 9px;
    letter-spacing: -.01em;
    padding: 13px 18px;
    position: relative;
    transition: transform 150ms ease, box-shadow 150ms ease;
    z-index: 2147483640;
  }
  .db-launcher:hover { box-shadow: 0 18px 42px rgba(3, 28, 36, .38); transform: translateY(-2px); }
  .db-launcher:focus-visible { outline: 3px solid #68d7dc; outline-offset: 3px; }
  .db-launcher-arrow { color: #79e0d8; font-size: 19px; line-height: 1; }
  .db-launcher-more { aspect-ratio: 1; justify-content: center; padding: 13px; }
  .db-launcher-menu {
    background: #fff;
    border: 1px solid #d7e3e1;
    border-radius: 14px;
    box-shadow: 0 16px 38px rgba(3, 28, 36, .22);
    display: grid;
    margin: 0 0 9px auto;
    overflow: hidden;
    padding: 5px;
    width: 230px;
  }
  .db-launcher-menu button {
    background: transparent;
    border: 0;
    border-radius: 9px;
    color: #23444b;
    cursor: pointer;
    font-size: 13px;
    font-weight: 650;
    padding: 10px 11px;
    text-align: left;
  }
  .db-launcher-menu button:hover { background: #edf6f4; }
  .db-launcher-menu button:focus-visible { outline: 2px solid #078783; outline-offset: -2px; }

  .db-overlay {
    align-items: center;
    background: rgba(5, 23, 30, .68);
    display: flex;
    inset: 0;
    justify-content: center;
    padding: 24px;
    position: fixed;
    z-index: 2147483646;
  }

  .db-dialog {
    background: #f8fbfa;
    border: 1px solid rgba(255,255,255,.7);
    border-radius: 22px;
    box-shadow: 0 30px 90px rgba(0, 20, 27, .42);
    color: #12343c;
    max-height: calc(100vh - 48px);
    max-width: 720px;
    overflow: auto;
    padding: 28px;
    width: 100%;
  }

  .db-dialog-header { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 22px; }
  .db-dialog h2 { color: #0a303b; font-size: 28px; letter-spacing: -.035em; line-height: 1.1; margin: 5px 0 6px; }
  .db-dialog p { color: #587078; font-size: 13px; line-height: 1.5; margin: 0; }
  .db-eyebrow { color: #057f7c; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .db-icon-button { background: transparent; border: 0; color: #61777d; cursor: pointer; font-size: 30px; line-height: 1; padding: 0 3px; }
  .db-icon-button:focus-visible { outline: 2px solid #057f7c; outline-offset: 3px; }

  .db-highlight-grid {
    background: linear-gradient(135deg, #063d4d 0%, #096b6e 100%);
    border-radius: 16px;
    color: #fff;
    display: grid;
    gap: 1px;
    grid-template-columns: repeat(3, 1fr);
    margin-bottom: 20px;
    overflow: hidden;
  }
  .db-highlight-grid > div { background: rgba(255,255,255,.045); padding: 16px; }
  .db-highlight-grid span { color: #b7e5e3; display: block; font-size: 11px; margin-bottom: 4px; }
  .db-highlight-grid strong { font-size: 17px; }

  .db-notice { border-radius: 10px; font-size: 13px; line-height: 1.45; margin: 0 0 18px; padding: 11px 13px; }
  .db-notice-warning { background: #fff2d5; border: 1px solid #f3d38a; color: #694a07; }
  .db-notice-error { background: #feeceb; border: 1px solid #f1b6b0; color: #84271f; }
  .db-notice-info { background: #e9f5f4; border: 1px solid #bdded9; color: #205b59; }

  .db-form-grid { display: grid; gap: 15px 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .db-field { color: #38545a; display: grid; font-size: 12px; font-weight: 700; gap: 6px; }
  .db-field-wide { grid-column: 1 / -1; }
  .db-field input, .db-field select, .db-field textarea {
    background: #fff;
    border: 1px solid #c6d5d5;
    border-radius: 9px;
    color: #102f36;
    min-height: 42px;
    outline: none;
    padding: 10px 11px;
    width: 100%;
  }
  .db-field textarea { min-height: 76px; resize: vertical; }
  .db-field input:focus, .db-field select:focus, .db-field textarea:focus { border-color: #078783; box-shadow: 0 0 0 3px rgba(7,135,131,.12); }
  .db-input-with-suffix { display: flex; position: relative; }
  .db-input-with-suffix input { padding-right: 52px; }
  .db-input-with-suffix > span { color: #71858a; font-size: 12px; font-weight: 600; position: absolute; right: 11px; top: 14px; }

  .db-privacy-note { border-top: 1px solid #dce7e5; margin-top: 22px !important; padding-top: 15px; }
  .db-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .db-dialog form > .db-actions {
    backdrop-filter: blur(10px);
    background: rgba(248, 251, 250, .96);
    border-top: 1px solid #dce7e5;
    bottom: -28px;
    margin: 20px -28px -28px;
    padding: 16px 28px 22px;
    position: sticky;
  }
  .db-button {
    align-items: center;
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    font-weight: 750;
    justify-content: center;
    min-height: 41px;
    padding: 10px 17px;
    text-decoration: none;
  }
  .db-button:disabled { cursor: not-allowed; opacity: .48; }
  .db-button-primary { background: #087b78; color: #fff; }
  .db-button-primary:hover:not(:disabled) { background: #056965; }
  .db-button-secondary { background: #e6f3f1; border-color: #bad8d4; color: #075d5b; }
  .db-button-quiet { background: transparent; color: #526a70; }
  .db-button-danger { background: #fff0ee; border-color: #efc2bc; color: #8c2d24; }
  .db-button:focus-visible { outline: 3px solid #68d7dc; outline-offset: 2px; }
  .db-action-spacer { flex: 1; }

  .db-status-dialog { max-width: 430px; padding: 38px; text-align: center; }
  .db-status-dialog h2 { margin-top: 8px; }
  .db-status-dialog p { font-size: 14px; }
  .db-status-mark { align-items: center; border-radius: 50%; display: flex; font-size: 26px; font-weight: 800; height: 54px; justify-content: center; margin: 0 auto 18px; width: 54px; }
  .db-status-mark-loading { background: #e2f2f0; }
  .db-status-mark-success { background: #dff3e9; color: #13714b; }
  .db-status-mark-error { background: #fee7e4; color: #a3342b; }
  .db-spinner { animation: db-spin 800ms linear infinite; border: 3px solid #acd9d5; border-radius: 50%; border-top-color: #087b78; height: 28px; width: 28px; }
  .db-actions-centered { justify-content: center; }
  .db-setup-dialog { max-width: 520px; }
  .db-setup-dialog form > .db-actions { position: static; }
  .db-garmin-key-link { align-items: center; background: linear-gradient(135deg, #073f4d 0%, #087c78 100%); border: 1px solid #086d70; border-radius: 14px; box-shadow: 0 9px 22px rgb(6 76 78 / 18%); color: #fff; display: grid; gap: 12px; grid-template-columns: 38px minmax(0, 1fr) auto; margin: 0 0 18px; padding: 13px 14px; text-decoration: none; }
  .db-garmin-key-link > span { align-items: center; background: rgb(255 255 255 / 14%); border: 1px solid rgb(255 255 255 / 22%); border-radius: 10px; display: flex; font-size: 15px; font-weight: 900; height: 38px; justify-content: center; width: 38px; }
  .db-garmin-key-link strong { color: #fff; font-size: 13px; line-height: 1.35; }
  .db-garmin-key-link small { background: rgb(255 255 255 / 12%); border: 1px solid rgb(255 255 255 / 20%); border-radius: 999px; color: #fff; font-size: 10px; font-weight: 800; padding: 7px 9px; white-space: nowrap; }
  .db-garmin-key-link:focus-visible { outline: 3px solid #6ad4ca; outline-offset: 2px; }
  .db-setup-steps { color: #38545a; display: grid; font-size: 14px; gap: 10px; line-height: 1.5; margin: 0 0 22px; padding-left: 22px; }
  .db-setup-dialog .db-notice { margin-top: 14px; }

  .db-batch-dialog { max-width: 900px; padding-bottom: 0; }
  .db-stepper {
    display: grid;
    gap: 0;
    grid-template-columns: repeat(3, 1fr);
    list-style: none;
    margin: 0 0 22px;
    padding: 0;
  }
  .db-stepper li {
    align-items: center;
    border-bottom: 2px solid #d7e4e2;
    color: #789096;
    display: flex;
    font-size: 11px;
    font-weight: 800;
    gap: 7px;
    letter-spacing: .06em;
    padding: 0 0 10px;
    text-transform: uppercase;
  }
  .db-stepper li span {
    align-items: center;
    background: #e4eceb;
    border-radius: 50%;
    display: inline-flex;
    height: 23px;
    justify-content: center;
    width: 23px;
  }
  .db-stepper .db-step-active { border-color: #119690; color: #076e6b; }
  .db-stepper .db-step-active span { background: #087b78; color: #fff; }

  .db-batch-summary {
    background: linear-gradient(135deg, #073f4d 0%, #087872 100%);
    border-radius: 16px;
    color: #fff;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-bottom: 17px;
    overflow: hidden;
  }
  .db-batch-summary div { border-right: 1px solid rgba(255,255,255,.12); padding: 15px 17px; }
  .db-batch-summary div:last-child { border-right: 0; }
  .db-batch-summary strong { display: block; font-size: 22px; line-height: 1; margin-bottom: 5px; }
  .db-batch-summary span { color: #c0e7e3; font-size: 11px; }

  .db-dive-list, .db-review-list, .db-result-list, .db-skipped-list { display: grid; gap: 9px; }
  .db-dive-list { margin-bottom: 17px; max-height: 390px; overflow: auto; padding-right: 3px; }
  .db-dive-choice {
    align-items: center;
    background: #fff;
    border: 1px solid #d5e2e0;
    border-radius: 13px;
    cursor: pointer;
    display: grid;
    gap: 12px;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    padding: 13px 14px;
    transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
  }
  .db-dive-choice:hover { border-color: #8fcac5; box-shadow: 0 7px 20px rgba(9, 80, 82, .08); transform: translateY(-1px); }
  .db-dive-choice > input { opacity: 0; pointer-events: none; position: absolute; }
  .db-choice-check {
    align-items: center;
    background: #fff;
    border: 1.5px solid #b8ccca;
    border-radius: 6px;
    color: transparent;
    display: flex;
    font-size: 13px;
    height: 22px;
    justify-content: center;
    width: 22px;
  }
  .db-dive-choice > input:checked + .db-choice-check { background: #087b78; border-color: #087b78; color: #fff; }
  .db-dive-choice > input:focus-visible + .db-choice-check { outline: 3px solid #68d7dc; outline-offset: 2px; }
  .db-dive-choice-main, .db-dive-choice-meta { display: grid; gap: 4px; }
  .db-dive-choice-main strong { color: #163b43; font-size: 14px; }
  .db-dive-choice-main span, .db-dive-choice-meta span { color: #70868b; font-size: 11px; }
  .db-dive-choice-meta { min-width: 130px; text-align: right; }
  .db-dive-choice-meta strong { color: #3c5c62; font-size: 12px; }

  .db-sticky-actions {
    backdrop-filter: blur(10px);
    background: rgba(248, 251, 250, .96);
    border-top: 1px solid #dce7e5;
    bottom: 0;
    margin: 20px -28px 0;
    padding: 16px 28px 22px;
    position: sticky;
  }

  .db-review-toolbar {
    align-items: end;
    background: #eaf5f3;
    border: 1px solid #c9e1de;
    border-radius: 14px;
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, 1fr) minmax(150px, 1.25fr);
    margin-bottom: 16px;
    padding: 13px 15px;
  }
  .db-review-toolbar > div { color: #5c767b; display: grid; font-size: 11px; gap: 2px; }
  .db-review-toolbar > div strong { color: #0b615e; font-size: 18px; }
  .db-review-toolbar label { color: #3b5a60; display: grid; font-size: 11px; font-weight: 750; gap: 5px; }
  .db-review-toolbar select { background: #fff; border: 1px solid #bcd4d1; border-radius: 8px; color: #193b42; min-height: 36px; padding: 7px 9px; }

  .db-duplicate-method {
    align-items: baseline;
    background: #f5f8f7;
    border: 1px solid #dce7e5;
    border-radius: 11px;
    color: #667d81;
    display: flex;
    font-size: 10px;
    gap: 6px;
    line-height: 1.45;
    margin: -6px 0 16px;
    padding: 9px 11px;
  }
  .db-duplicate-method strong { color: #31585d; }

  .db-skipped-list { margin-bottom: 16px; }
  .db-skip-row, .db-result-row {
    align-items: center;
    border-radius: 11px;
    display: grid;
    gap: 10px;
    grid-template-columns: 26px minmax(0, 1fr) auto;
    padding: 10px 12px;
  }
  .db-skip-duplicate { background: #edf6f3; color: #1a6850; }
  .db-skip-failed { background: #fff0ee; color: #8c2d24; }
  .db-skip-row > span { font-size: 16px; font-weight: 800; text-align: center; }
  .db-skip-row strong, .db-result-row strong { font-size: 12px; }
  .db-skip-row p, .db-result-row p { font-size: 11px; margin-top: 2px; }

  .db-review-list { max-height: 430px; overflow: auto; padding-right: 3px; }
  .db-review-card { background: #fff; border: 1px solid #d4e1df; border-radius: 14px; overflow: hidden; }
  .db-review-card-off { opacity: .58; }
  .db-review-card > header { align-items: center; background: #f0f7f6; color: #5d767b; display: flex; font-size: 11px; justify-content: space-between; padding: 10px 13px; }
  .db-review-toggle { align-items: center; color: #194d4d; display: flex; font-size: 11px; font-weight: 800; gap: 7px; text-transform: uppercase; }
  .db-review-toggle input { accent-color: #087b78; height: 16px; width: 16px; }
  .db-review-fields { display: grid; gap: 12px; grid-template-columns: 1.2fr 1.2fr .65fr; padding: 13px; }

  .db-progress-dialog { max-width: 560px; padding: 34px; text-align: center; }
  .db-progress-dialog .db-stepper { text-align: left; }
  .db-progress-dialog h2 { margin-top: 8px; }
  .db-progress-track { background: #d9e8e6; border-radius: 999px; height: 9px; margin: 24px 0 10px; overflow: hidden; }
  .db-progress-track span { background: linear-gradient(90deg, #0a817d, #51c0b4); display: block; height: 100%; transition: width 180ms ease; }
  .db-progress-note { color: #789095 !important; font-size: 11px !important; }

  .db-result-list { margin: 4px 0 18px; max-height: 420px; overflow: auto; }
  .db-result-imported { background: #e7f5ee; color: #176345; }
  .db-result-skipped { background: #f0f3f3; color: #5f7478; }
  .db-result-failed { background: #fff0ee; color: #8c2d24; }
  .db-result-mark { font-size: 17px; font-weight: 850; text-align: center; }
  .db-result-row a { border: 1px solid currentColor; border-radius: 999px; color: inherit; font-size: 11px; font-weight: 800; padding: 6px 10px; text-decoration: none; }

  @keyframes db-spin { to { transform: rotate(360deg); } }

  @media (max-width: 620px) {
    .db-overlay { align-items: flex-end; padding: 0; }
    .db-dialog { border-radius: 22px 22px 0 0; max-height: 94vh; padding: 22px 18px; }
    .db-dialog h2 { font-size: 24px; }
    .db-form-grid { grid-template-columns: 1fr; }
    .db-field-wide { grid-column: auto; }
    .db-highlight-grid strong { font-size: 14px; }
    .db-actions .db-button { flex: 1 1 auto; }
    .db-dialog form > .db-actions { bottom: -22px; margin: 20px -18px -22px; padding: 14px 18px 18px; }
    .db-launcher-wrap { bottom: 16px; right: 16px; }
    .db-batch-dialog { padding-bottom: 0; }
    .db-batch-summary { grid-template-columns: repeat(3, 1fr); }
    .db-batch-summary div { padding: 12px 10px; }
    .db-dive-choice { grid-template-columns: 22px minmax(0, 1fr); }
    .db-dive-choice-meta { grid-column: 2; text-align: left; }
    .db-review-toolbar { grid-template-columns: repeat(3, 1fr); }
    .db-review-toolbar label { grid-column: 1 / -1; }
    .db-review-fields { grid-template-columns: 1fr; }
    .db-review-card > header { align-items: flex-start; flex-direction: column; gap: 7px; }
    .db-sticky-actions { margin: 20px -18px 0; padding: 14px 18px 18px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .db-launcher, .db-spinner { animation: none; transition: none; }
  }
`;
