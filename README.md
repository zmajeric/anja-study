# anja-study

Učni tečaji, en **predmet** na mapo (`histology/` je prvi in služi kot zgled). Vsi predmeti imajo
enak izgled in enake kvize; razlikujejo se samo v vsebini. Pomen besed (predmet, poglavje,
lekcija, vrste kvizov, razmerje vprašanj …) je v [`CONTEXT.md`](CONTEXT.md).

## Kje je stran

- **Objavljena**: GitHub Pages, `https://zmajeric.github.io/anja-study/`. Vklopi se enkrat:
  GitHub → repozitorij → *Settings → Pages → Deploy from a branch → `main` / `(root)`*.
  ⚠️ Repozitorij in stran sta **javna** (tudi prosojnice in skripta v `source/`).
- **Lokalno**: `node .claude/serve.js`, nato <http://localhost:8765>.
  Strani ne delujejo, če jih odpreš neposredno z diska (dvoklik), ker berejo `subject.json`.

---

## Kaj lahko narediš

Vse spodaj napišeš Claudu v Claude Code. Delaj v mapi predmeta (npr. odpri sejo v `histology/`).

### Dve vrsti seje: učna in razvojna

**Učna seja** (study session, privzeta) dela z enim samim predmetom.

- Seja, odprta v mapi predmeta, je učna seja za ta predmet.
- Seja, odprta v korenu repozitorija, najprej vpraša *"Is this a study session, and for which
  subject?"*. Odgovoriš v svoji vrstici:
  ```
  predmet histology
  ```
  (ali samo `histology`). Dokler tega ne napišeš, se agent ne more dotakniti nobenega predmeta.
  Predmeta med sejo ni mogoče zamenjati: za drug predmet odpri novo sejo.
- Če bi agent posegel v drug predmet, ga varovalo ustavi in ti to jasno pove.

### Nov predmet

1. Ustvari mapo, npr. `anatomija/`.
2. Vanjo prilepi vse vire, ki jih imaš (skripte, prosojnice, zapiske, primere izpitov).
3. Odpri sejo v tej mapi in zaženi:
   ```
   /anja-teach
   ```
4. Agent vire premakne v `source/`, izvleče njihovo besedilo in te vpraša:
   ime predmeta · zakaj ga učiš, datum in jezik izpita · **razmerje vprašanj** (MCQ % / pisna % /
   slikovna %) · število možnosti pri MCQ · dolžino poskusnega izpita · seznam poglavij
   (predlaga ga iz virov, ti potrdiš) · česa ne učiti.
5. Zapiše `subject.json`, `MISSION.md`, `RESOURCES.md` in ostalo. Predmet se pojavi na začetni
   strani.

### Nov vir za obstoječi predmet

1. Datoteko daj v `<predmet>/source/`.
2. Napiši:
   ```
   /anja-teach nov-vir
   ```
   (ali samo "dodal sem vir"). Agent vir prebere in vpiše v `RESOURCES.md`, poišče
   **nasprotja** z obstoječimi lekcijami in **vrzeli**, ki jih zapolni, in te **vpraša**, preden
   karkoli spremeni.

Če na vir pozabiš, te agent ob naslednji seji sam opozori na datoteke v `source/`, ki še niso
vpisane.

### Primer izpita

Tudi primer izpita je vir: daj ga v `source/` in zaženi `/anja-teach nov-vir`. Agent:

- vprašanja iz primera doda v banke kot poseben niz **Exam sample** (vadiš jih lahko posebej:
  izbira niza na strani kviza);
- opiše obliko izpita (vrste vprašanj, število možnosti, slike);
- te vpraša, ali naj spremeni število možnosti, dolžino poskusnega izpita ali razmerje. Razmerje
  vprašanj vedno določiš ti; primer pokaže samo slog.

### Dodaten, bolj usmerjen kviz

```
/anja-teach kviz 5 slike 10
/anja-teach kviz vse mešano
```

ali z besedami: "naredi kviz za poglavje 5, samo slike".

| Del | Možnosti | Privzeto |
|---|---|---|
| poglavje | številka ali `vse` | vpraša |
| vrsta | `mcq` · `slike` · `pisno` · `mešano` | `mešano` |
| število | koliko novih vprašanj | 10 |

Nova vprašanja se shranijo kot nov niz z današnjim datumom. Dobiš povezavo do njih, od takrat pa
so tudi v mešanem kvizu in poskusnem izpitu.

### Lekcija

```
/anja-teach
```

brez dodatkov: agent pogleda tvoje dosedanje rezultate in predlaga naslednjo lekcijo. Lahko pa
poveš, kaj želiš ("lekcija o hrustancu"). Po kvizu klikni *Copy my results* in rezultat prilepi
agentu, da ve, kaj ponoviti.

### Moje opombe z iPada (GoodNotes)

1. V GoodNotes označuj in piši po viru, nato ga izvozi kot PDF.
2. Izvoz daj v `source/` **poleg originala** z dodanim `_edited`:
   ```
   source/3 Cell Aalen.pdf          ← original, ostane
   source/3 Cell Aalen_edited.pdf   ← tvoj izvoz z opombami
   ```
3. Zaženi:
   ```
   /anja-teach opombe
   ```
   Agent prebere vse **označbe** (highlight) in **ročno pisane opombe** (ink), prepiše rokopis
   (nečitljive besede označi z `[?]`), vsako opombo razvrsti v poglavje in jo pripne k ustreznemu
   razdelku lekcije. Če ob naslednji seji dodaš nov ali spremenjen `_edited` PDF, te agent sam
   opomni.

Kje jih vidiš:

- **V lekcijah**: ob robu, poleg razdelka, na katerega se nanašajo; ostale v okvirju *My notes*
  na koncu lekcije.
- **Na strani *My notes*** (meni na vrhu): vse opombe po poglavjih, s stranjo v viru; filtriraš po
  vrsti, barvi, poglavju, viru in besedilu.

Iskanje po oznakah (v pogovoru z agentom ali na strani):

| Oznaka | Pomeni |
|---|---|
| `ipad-note:HIGHLIGHT` | vse označbe |
| `ipad-note:INK` | vse ročno pisane opombe (`ipad-note:TEXT` pomeni isto) |
| `ipad-note:BLUE` | vse modre (označbe in pisane) |
| `ipad-note:INK-BLUE` | modre pisane opombe |

Primer: *"pokaži mi ipad-note:HIGHLIGHT-YELLOW iz poglavja 3"*. Kviz samo iz tvojih označb:
`/anja-teach kviz 3 ipad-note:HIGHLIGHT-YELLOW 10`; na strani kviza nato izbereš *From my notes*.

Če popraviš prepis ("opomba na strani 12 pravi …"), agent popravek shrani in ga ohrani tudi ob
ponovnem branju PDF-ja. Barve nimajo zapisanega pomena: pomen poznaš ti, agent jih samo filtrira.

⚠️ Znano: GoodNotes opombe pri izvozu včasih "zapeče" v stran. Takih opomb agent še ne zna
prebrati; sporoči, na katerih straneh so. Ko bo na voljo prvi pravi izvoz, se ta del dokonča.

### Slike iz virov

Ob novem predmetu in ob vsakem novem viru agent iz virov izvleče vse slike v
`<predmet>/assets/img/source/` (s seznamom vir · stran · bližnje besedilo). Za slikovna vprašanja
nato izbere prave, jih obreže in shrani z opisnim imenom v `assets/img/`.

### Internet in agentovo znanje

Privzeto agent uporablja **samo tvoje vire**. Dve ključni besedi to odpreta, vsaka samo za eno
sporočilo in največ za eno poglavje:

- `poglej-internet`: sme iskati po spletu. Vsak najdeni vir vpiše v `RESOURCES.md` z oznako
  "web · poglavje · datum" in splošna dejstva označi.
  Primer: *"poglej-internet: poglavje 3, kako deluje Golgijev aparat?"*
- `poglej-agenta`: sme uporabiti svoje splošno znanje. Vsako tako dejstvo označi
  "general knowledge, not from the resources".

### Kvizi na strani

Na strani predmeta je pet vrst kvizov, ki so enaki za vse predmete:

| Kviz | Vsebuje |
|---|---|
| Mixed quiz | MCQ, pisna in slikovna vprašanja v razmerju predmeta |
| MCQ quiz | samo besedilna MCQ |
| Write quiz | samo pisna vprašanja |
| Image quiz | samo slikovna vprašanja |
| Mock exam | naključen izpit iz vseh poglavij, dolžine in razmerja pravega izpita |

Poglavje in niz vprašanj izbereš na strani; naslov si zapomni izbiro, npr.
`quiz/image.html?subject=histology&chapter=ch5&set=round2`.

---

## Kaj lahko prilagodiš

| Kaj | Kje | Kako |
|---|---|---|
| Razmerje vprašanj, št. možnosti, dolžina poskusnega izpita | `<predmet>/subject.json` → `exam` | Uredi številke ali reci agentu "spremeni razmerje na 60/20/20". `mix` = MCQ / pisna / slikovna (vsota 100); `imageForms` = delež slikovnih vprašanj kot MCQ ali pisno (privzeto 100/0). |
| Poglavja, lekcije, cheat sheets (meni na vrhu strani) | `<predmet>/subject.json` | Agent jih posodablja sam; ročno samo za popravke naslovov. |
| Vprašanja pri novem predmetu | `.claude/skills/anja-teach/NEW-SUBJECT.md`, seznam pod `INTERVIEW` | Dodaj točko na seznam in v tabeli koraka 3 napiši, kam gre odgovor. Ali reci agentu: "dodaj korak v intervju za nov predmet: …". |
| Postopek za nov vir / kviz | `.claude/skills/anja-teach/NOV-VIR.md`, `KVIZ.md` | Uredi besedilo; velja za vse predmete. |
| Pravila za agente (viri, en predmet, ključne besede) | `AGENTS.md` | Velja za Claude in druge agente. |
| Izgled vseh strani | `common/course.css` | Ena datoteka za vse predmete. |
| Obnašanje kvizov | `common/quiz.js`, `common/bank.js`, `common/quizpage.js` | Ena kopija za vse predmete. |
| Varovalo "en predmet na sejo" in spletni dostop | `.claude/hooks/subject-guard.js`, `.claude/settings.json` | Vsak predmet ima enako kopijo `settings.json` v `<predmet>/.claude/`; spremeni vse skupaj. |
| Branje slik in opomb iz virov | `common/tools/extract-images.py`, `common/tools/extract-notes.py` | Npr. najmanjša velikost slike (`MIN_SIDE`) ali barvna paleta opomb (`PALETTE`). |
| Postopek za opombe | `.claude/skills/anja-teach/OPOMBE.md` | Uredi besedilo; velja za vse predmete. |
| Besednjak | `CONTEXT.md` (delovni prostor), `<predmet>/GLOSSARY.md` (vsebina predmeta) | |

Vse nastavitve so v repozitoriju: ko ga potegneš na drug računalnik, deluje enako.

## Struktura

```
AGENTS.md  CLAUDE.md  CONTEXT.md  README.md
index.html  subject.html  notes.html  subjects.json
common/            skupni izgled, logika kvizov in opomb; tools/ = skripti za slike in opombe
quiz/              pet skupnih strani s kvizi
docs/adr/          zakaj je nekaj narejeno tako
.claude/           varovalo, skill /anja-teach, lokalni strežnik
<predmet>/         MISSION.md  NOTES.md  GLOSSARY.md  RESOURCES.md  subject.json
                   source/  lessons/  reference/  learning-records/
                   assets/bank/  assets/img/   (samo vsebina tega predmeta; img/source/ = surove slike)
                   notes/                     (tvoje opombe z iPada)
                   .claude/settings.json      (kopija korenske)
```
