# Browser QA report

Initial desktop run: 2026-11-12; automated re-verification: **2026-11-17**. This is a partial browser acceptance result, not a physical microphone certification.

## Actual desktop browser observations

Native Safari was controlled through the available computer-use tools against a loopback development server with a throwaway passcode, `DEMO_MODE=true`, memory storage and opt-in Live enabled. No real passenger information was used. Brave/Safari access was intermittent; accessibility/screenshot capture reported audio/video capture failures, invalid parameters and noWindowsAvailable. The computer-use namespace was subsequently removed from the session. No alternate browser automation dependency was installed.

| Scenario | Actual result / scope |
| --- | --- |
| Login page rendering | PASS: desktop screenshot and accessibility tree show bilingual branding, labelled passcode form, independent-prototype and synthetic-data disclosures |
| Team login | PASS: local throwaway passcode accepted, redirected to dashboard; not Supabase Auth |
| Fixture selection | PASS: selected Kavya synthetic profile; card panel shows masked card, synthetic balance and fixed timestamp; recharge and activity panels render |
| Dashboard layout | PASS at inspected desktop window: navigation, language/profile controls, chat and card panels legible. Not a mobile/accessibility certification |
| Ordinary English text | **Provider failed** after bounded attempts. Browser visibly rendered timeout explanation, correlation reference, Read aloud control and explicit Retry. Card/support controls and editable text remained present |
| Editable captions / Tamil / code mix | Text editor exists. Attempts to manipulate its text and language selector were not visibly confirmed during intermittent native automation; no successful browser input claimed |
| Voice input, English/Tamil | Controls render, but actual speech recognition was not verified. No microphone grant or physical speech captured |
| Live voice | Opt-in start control and privacy disclosure render. No actual browser Live audio session was started in this QA run |
| Mobile viewport | NOT VERIFIED: no physical mobile browser or reliable emulated mobile viewport available during this run |

No screenshot containing credentials was saved to the repository. Desktop observations concern the local development server; the production bundle is separately build/smoke-tested, and a deployed Vercel Preview has not been tested.

## Automated evidence — distinct from device testing

`npm test` passes **57 tests across 10 files** on 17 November. Relevant DOM/fake-adapter/SDK-event tests cover:

- Usable text fallback when recognition is unavailable; microphone-denial explanation and recognition abort on unmount.
- Tamil labels and document language, shared language persistence/detection, script/code-mixed selection, pronunciation normalization.
- Live failure retains browser/text controls; authenticated tool capability restrictions, cancelled calls, transcript bounds and interruption events.
- PCM encoding and browser lifecycle cleanup using mocked audio/recognition surfaces.
- HTTP-504 provider reply remains visible with correlation reference and explicit retry; retry performs another request.
- Draft focus/review, cancellation without write, one confirmed ticket write and passenger isolation.

Local production HTTP smoke covers login, fixture/session selection, card ownership, recharge/transactions, station lookup, known/unknown/date-aware fare behavior, ticket confirmation/replay/isolation, cross-origin denial, localized disabled-provider error and logout. Actual Tamil and code-mixed HTTP probes on 12 November returned safe Tamil 503/429 explanations with matching references; these are not browser transcription tests.

Earlier English/Tamil Live SDK synthetic-text probes succeeded with an authorized read tool (recorded in the historical progress checkpoint). They used no microphone; they are not a fresh physical voice acceptance test or evidence that ordinary text generation now works.

## Remaining device acceptance checklist

On the configured Preview, with synthetic questions only:

1. Test login/logout, reload/session retention, profile isolation, all panels, forms and keyboard navigation at desktop and 360/390/768-pixel layouts; verify no horizontal overflow or hidden confirmation controls.
2. Test English and Tamil physical speech, Tamil script transcription and code-mixed Tamil-English queries. Correct captions before sending. Confirm explicit send and readable localized error/retry behavior.
3. Test permission denial, unsupported recognition, Stop, 45-second timeout, language/profile/section switch, tab hide and navigation cleanup. Confirm microphone indicators stop. Do not treat synthetic input as physical-device evidence.
4. Start optional Live only after consent; test native microphone sample rate, speaker output, interruption during playback, cancelled tool calls and provider/network failure. Confirm browser/text fallback still works. Keep Live disabled by default until this passes.
5. Test read-aloud with and without an installed Tamil voice, pronunciation with a native Tamil reviewer, stop playback and recovery. A voice list or invoked synthesis API alone is not a pronunciation score.
6. Record browser/OS/device, viewport, date and individual outcomes. Recheck Preview on the exact pushed commit. No passing physical-microphone, Tamil acoustic-quality or mobile claim is made here.
