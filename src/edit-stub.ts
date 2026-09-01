import type { ExtensionAPI, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const EDIT_STUB_DESCRIPTION =
  'DISABLED under pi-hashline-edit-pro. This tool performs NO edits and will always return an error. ' +
  "Hashline edit mode is active — use the hash-anchored tools instead: " +
  '- "replace" — replace a line range (by stable 3-char hash anchors) with new lines; ' +
  '- "insert" — insert lines before or after an anchor; ' +
  '- "read_with_anchors" — read a file with stable 3-char hash anchors. ' +
  "These guarantee unambiguous, stable edits. Do NOT use \"edit\"; any \"edit\" call is rejected without touching the filesystem.";

const EDIT_STUB_ERROR =
  '[E_EDIT_DISABLED] The "edit" tool is disabled because pi-hashline-edit-pro is active. ' +
  "No file was modified. Use the hash-anchored tools instead: " +
  '"replace" (replace a line range by 3-char anchors), ' +
  '"insert" (insert lines before/after an anchor), and ' +
  '"read_with_anchors" (read with stable hash anchors).';

const editStubSchema = Type.Object({
  path: Type.String({ description: "Path to the file to edit (relative or absolute)." }),
  edits: Type.Optional(
    Type.Array(
      Type.Object({
        oldText: Type.String({ description: "Exact text for one targeted replacement." }),
        newText: Type.String({ description: "Replacement text for this targeted edit." }),
      }),
      { description: "Array of precise text replacements." },
    ),
  ),
  oldText: Type.Optional(Type.String({ description: "Legacy single-edit form: exact old text." })),
  newText: Type.Optional(Type.String({ description: "Legacy single-edit form: replacement text." })),
});

type EditStubDetails = { disabled: true; reason: "hashline-edit-pro" };

function buildEditStubDef(): ToolDefinition<any, EditStubDetails, undefined> {
  return {
    name: "edit",
    label: "edit (disabled)",
    description: EDIT_STUB_DESCRIPTION,
    parameters: editStubSchema,
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      return {
        content: [{ type: "text", text: EDIT_STUB_ERROR }],
        isError: true,
        details: { disabled: true, reason: "hashline-edit-pro" },
      };
    },
  };
}

export function regEditStub(pi: ExtensionAPI): void {
  pi.registerTool(buildEditStubDef());
}
