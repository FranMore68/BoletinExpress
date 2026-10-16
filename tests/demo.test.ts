import assert from "node:assert/strict";
import test from "node:test";
import { copy, translate } from "../src/lib/i18n/copy.ts";
import {
  applyExample,
  createDraft,
  editField,
  type Fields,
  initialDemo,
  missingFields,
  validateExample,
} from "../src/modules/demo/model.ts";

const example: Fields = {
  holder: "TITULAR FICTICI",
  identifier: "FICTICI01",
  address: "Carrer de prova 12",
  power: "9,2",
  use: "Prova",
  notes: "Dades fictícies",
};
function completeDraft() {
  const s = createDraft(initialDemo(), "CIE");
  return { ...s, documents: [applyExample(s.documents[0], example)] };
}
test("las propuestas de ejemplo conservan cambios manuales, incluidos campos vaciados", () => {
  const doc = createDraft(initialDemo(), "BRIE").documents[0];
  const edited = editField(editField(doc, "power", "3,45"), "holder", "");
  const result = applyExample(edited, example);
  assert.equal(result.data.power, "3,45");
  assert.equal(result.data.holder, "");
  assert.equal(result.data.address, example.address);
  assert.deepEqual(missingFields(result.data), ["holder"]);
  assert.equal(doc.data.power, "");
});
test("el cierre de la demo es idempotente y bloquea cambios del ejemplo", () => {
  const state = completeDraft(),
    id = state.documents[0].id;
  const sealed = validateExample(state, id);
  assert.equal(sealed.credits, 5);
  assert.equal(sealed.documents[0].validated, true);
  assert.equal(validateExample(sealed, id), sealed);
  assert.equal(
    editField(sealed.documents[0], "holder", "OTRO"),
    sealed.documents[0],
  );
  assert.equal(applyExample(sealed.documents[0], example), sealed.documents[0]);
  assert.equal(state.credits, 10);
});
test("la demo impide validar sin datos o con saldo simulado insuficiente", () => {
  const empty = createDraft(initialDemo(), "BRIE");
  assert.throws(
    () => validateExample(empty, empty.documents[0].id),
    /incomplete/,
  );
  const state = { ...completeDraft(), credits: 1 };
  assert.throws(
    () => validateExample(state, state.documents[0].id),
    /insufficient/,
  );
  assert.equal(state.credits, 1);
  assert.equal(state.documents[0].validated, false);
});
test("tres borradores activos y sus identificadores se mantienen coherentes al eliminar uno", () => {
  let state = initialDemo();
  for (let i = 0; i < 3; i++) state = createDraft(state, "BRIE");
  assert.throws(() => createDraft(state, "CIE"), /draftLimit/);
  const previousIds = state.documents.map((d) => d.id);
  state = createDraft({ ...state, documents: state.documents.slice(1) }, "CIE");
  assert.equal(state.documents.length, 3);
  assert.ok(!previousIds.includes(state.documents[2].id));
});
test("cada mensaje dispone de ES y CA y conserva sus variables de interpolación", () => {
  for (const [key, pair] of Object.entries(copy)) {
    assert.equal(pair.length, 2, key);
    assert.ok(
      pair.every((text) => text.trim().length > 0),
      key,
    );
    const variables = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(variables(pair[0]), variables(pair[1]), key);
  }
  assert.equal(translate("ca", "page", { page: 2 }), "Pàgina 2 de 2");
  assert.equal(translate("es", "confirm", { cost: 5 }), "Confirmar · 5 KC");
});
