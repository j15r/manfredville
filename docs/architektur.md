# Manfredville – Architektur, Technik- und Testhinweise

> Nachschlagewerk; aus `status.md` ausgelagert. Vor Änderungen an einem Bereich den passenden Abschnitt lesen (Übersicht siehe `CLAUDE.md`).

## Architektur-Gesamtbild
Erzeuger (Förster, Holzfäller, Bauernhof, Mine, Hopfenfarm, Steinbruch, Fischerhütte, Schaffarm, Jägerhütte, Tabakfarm, Gewürzfarm, Pelzjägerhütte, Walfängerhütte) funktionieren nach demselben Muster: bei Intervall-Ablauf UND freiem Arbeiter wird ein Ziel gesucht, der Arbeiter läuft sichtbar dorthin, handelt und läuft zurück; erst bei der Rückkehr wird die Ware verbucht. Die vier Feldbau-Betriebe teilen sich den über `FIELD_FARMS` datengetriebenen Aussaat-/Ernte-Code; Holzfäller, Mine, Steinbruch, Fischer, Schäfer, Jäger, Fallensteller und Walfänger teilen sich die Arbeitsphase `'working'` aus `WORK_ACTIONS`. Sägewerk, Mühle, Bäckerei, Schmelzhütte, Brauerei, Weberei, Schneiderei, Schmiede und Kürschnerei sind ortsfeste Verarbeiter (`PROCESSORS`) mit `inputCapacity = 2`; **ihre sichtbaren Arbeiter stehen in der Parallel-Tabelle `PROCESSOR_WORK`** – wer einen neuen Verarbeiter einführt, trägt ihn in BEIDE Tabellen ein. Wohnhäuser sind reine Verbraucher und beziehen Nahrung, Bier, Kleidung und Luxus aus dem Vorrat IHRER Insel - seit v31 abhängig von ihrer WOHNSTUFE (siehe unten), die auch bestimmt, wie viele Bewohner hineinpassen und wie das Haus aussieht. Kapelle und Wirtshaus wirken über eine Luftlinien-Abdeckung. Die Fischerhütte hat eine Umgebungs-Bauvoraussetzung (`def.needsWater` mit Radius – sie ist keine Anlegestelle, ihr Fischer geht nur zum Ufer), Hafen, Kontor UND Walfängerhütte eine Küstenpflicht (`def.needsCoast`), das Kontor zusätzlich eine Einmaligkeitsregel (`def.oncePerIsland`), die vier Feldbau-Betriebe sowie Pelzjägerhütte, Kürschnerei und Walfängerhütte eine Klima-Voraussetzung (`def.climates`). **Die Walfängerhütte (v29) ist der Beleg, dass diese Voraussetzungen sich beliebig KOMBINIEREN lassen:** sie trägt Küstenpflicht und Klimabindung zugleich und brauchte dafür keine neue Regelzeile, nur zwei Felder in ihrer Definition. Hafen, Kontor und Schiff sind die drei Objekte mit interaktiven Infopanel-Aktionen. **Jedes Gebäude braucht dauerhaft Straßenanschluss** – die Ausnahmen stehen an EINER Stelle in `needsRoadAccess(b)`: das letzte verbleibende Lagerhaus und das Kontor.

**Die Insel ist die wirtschaftliche Einheit des Spiels (v25).** `islands[]` hält je Insel `{id, name, climate, tiles, cx, cy, storage}` sowie seit v33 `taxRate` (Steuersatz) und `customName` (vom Spieler vergebener Name), `islandOf[y][x]` die Zuordnung je Kachel (−1 = Wasser). Beides berechnet `computeIslands()` aus dem Gelände – nach `generateMap()` UND nach `applySave()` –, nie gespeichert. Zugriff ausschließlich über `islandAt`, `islandOfBuilding`, `storageOfIsland`, `stockOf`/`spendFrom`/`addTo`/`foodOf`/`spendFoodFrom`. **Wer irgendwo einen Warenbestand braucht, muss zuerst die Frage beantworten: welche Insel?** – mit GENAU EINER Ausnahme seit v29.1: **Münzen sind kartenweit** (`treasury`). Umgesetzt über einen getter/setter für `coin` auf jedem Insel-Bestand (`makeIslandStorage`), damit alle bestehenden Zugriffswege ohne Sonderfall dieselbe Kasse treffen. Nur Insel-Bestände tragen diesen Accessor, nie die lokalen Puffer der Gebäude - sonst wäre der Ausgabepuffer der Münzprägerei die Staatskasse.

**Warenknoten sind Lagerhaus UND Kontor (`isStorageNode`, v26).** Beide lagern unbegrenzt ein, beide beliefern Betriebe, beide zeigen auf `islands[id].storage`. Die Funktion existiert bewusst als EINE Stelle – vorher stand `type === 'warehouse'` an vier verschiedenen Punkten (`destCapacity`, die Kandidatenliste in `runLogistics`, der Verteilzweig, die Speicherlogik), und ein dritter Knotentyp hätte garantiert einen davon vergessen.

**Waren wechseln die Insel an genau EINER Stelle: `shipLoad`/`shipUnload`** (Münzen ausgenommen - die sind seit v29.1 ohnehin überall verfügbar und deshalb gar nicht verschiffbar, siehe `UNSHIPPABLE_GOODS`). Straßen können nicht über Wasser gebaut werden, also bleibt der gesamte automatische Warenfluss ohne jede Sonderbehandlung inselintern. Auch die Frachtrouten (v26, mehrstufig seit v32) gehen durch diese beiden Funktionen – sie geben dabei die Anlegestelle ausdrücklich mit, statt sie suchen zu lassen. Wer weitere Transportformen einführt, setzt sie ebenfalls hier auf.

**Steuern sind die zweite Geldquelle des Spiels (v33) und hängen an der WOHNSTUFE.** `TAX_PER_HEAD[tier]` mal Bewohner mal `TAX_RATES[isl.taxRate].factor`, alle `TAX_INTERVAL` in die kartenweite Kasse (`treasury`). Der Satz gilt JE INSEL und wirkt an zwei bestehenden Stellen zurück ins Spiel: `updateHouseGrowthAndStatus` (hoher Satz friert das Wachstum ein) und `upgradeBlocker`/`updateHouseUpgrade` (hoher Satz blockiert den Aufstieg, niedriger verkürzt die Wartezeit). Er kostet bewusst NIE Bewohner - dieselbe Linie wie Kleidung und Luxus. Gerechnet wird mit Bruchteilen; angezeigt und ausgegeben wird ohnehin nur in ganzen Münzen.

**`islandLabel(id)` ist die EINE Stelle, an der ein Inselname entsteht** - Titelzeile, Infopanels, Frachtrouten und Warenübersicht gehen alle darüber. Genau deshalb genügte für das Umbenennen (v33) ein zusätzliches Feld `customName`, das dort vorrangig gelesen wird; ein eigener Name gewinnt auch gegen den Rollennamen "Heimatinsel".

**Die Warenübersicht (v33) ist reine Anzeige und hält keinen eigenen Zustand** außer "offen/zu". Sie liest bei jedem Aufbau frisch aus `stockOf` und `buildings`, zeigt nur BESIEDELTE Inseln und nur Waren mit Bestand irgendwo - so bleibt die Tabelle am Spielanfang drei Spalten breit und wächst mit der Wirtschaft mit.

**Eine Frachtroute ist eine LISTE VON STATIONEN (v32), kein Paar von Enden.** `r.stops[i] = {x, y, load, amount}` - die Station sagt nur, was dort GELADEN wird; abgeladen wird an jeder Station alles andere. Diese eine Regel ersetzt das frühere Paar aus Hin- und Rückfracht deckungsgleich. Der Fahrautomat hat dadurch einen einzigen Zustand (`s.routeStop`, die Nummer der nächsten Station) statt zweier Beine, und ein Pendelverkehr ist schlicht der Fall "zwei Stationen". Dasselbe Kontor darf mehrfach vorkommen (Sternfahrt); ein Doppelhalt am selben Kai wird beim Weiterzählen ÜBERSPRUNGEN, statt verboten zu werden - sonst ließe sich eine Sternfahrt gar nicht zusammenbauen, weil sie über genau diesen Zwischenzustand entsteht. Verschwindet ein Kontor, verliert die Route nur diese Station; erst unter zwei Halten wird sie gelöscht (aufgeräumt an zwei Stellen: sofort in `removeBuilding`, als Netz in `updateRoutes`).

**Eine Frachtroute kann jetzt mehrere Schiffe haben (v34).** `shipsOnRoute(r)` (Plural) liefert alle; `s.routeStop`/`s.routeWait` hängen am SCHIFF, nicht an der Route, sodass mehrere Schiffe dieselbe Stationsliste unabhängig voneinander abfahren konnten, ohne dass der Fahrautomat selbst sich ändern musste - nur die Verdrängung in `assignShipToRoute` musste weg, plus ein Startversatz (`belegteSchiffe % stops.length`), damit eine neu eingeteilte Flotte sich verteilt statt am selben Kai loszupaddeln.

**Ein Schiff hat einen TYP, keine feste Kapazität mehr (`SHIP_TYPES`, v34).** `shipCapacity(ship)` ist die einzige Stelle, die daraus die Ladung eines KONKRETEN Schiffs ableitet (mit `small` als Rückfallwert für Schiffe ohne `shipType`, also jeden Spielstand vor v34); wo kein Schiff feststeht (eine Routenstation), gilt `SHIP_TYPES.large.capacity` als Obergrenze. Ein dritter Schiffstyp bräuchte nur einen weiteren Eintrag in dieser Tabelle - Baupreis, Kapazität und Baubutton am Hafen entstehen automatisch daraus.

**Baukosten laufen über ALLE Waren in `def.cost`, nicht mehr nur über Bretter (v34, ausgelöst durch den Leuchtturm).** `canBuildHere` und `tryPlaceBuilding` iterieren seither über `Object.keys(def.cost)` statt `def.cost.plank` fest zu lesen - für jedes bestehende Gebäude (weiterhin nur `{ plank: N }`) ändert das nichts, ein neues mit mehreren Waren im Preis (wie der Leuchtturm: Bretter UND Stein) braucht keinen Sonderfall mehr.

**Der Leuchtturm verbraucht Tran EINMAL JE NACHT, nicht laufend (v34).** `updateLighthouses()` erkennt den Sonnenuntergang als Vorwärts-Überschreiten der Schwelle `dayTime === 0.75` (ausdrücklich NICHT den Mitternachts-Rücksprung von ~0,99 auf ~0,01) und setzt dabei `isl.lighthouseFueled` für die kommende Nacht UND den folgenden Tag neu. Zwei bestehende Systeme lesen dieses eine Feld: `lighthouseSpeedBonus(s)` in `updateShips` (Geschwindigkeit) und `drawLighthouseGlow()` im Renderpfad (nächtliche Beleuchtung) - keines von beiden verwaltet einen eigenen Zustand.

**Jeder Produktionsbetrieb kann angehalten werden (`b.paused`, v31.1).** Zwei Prüfstellen tragen die ganze Mechanik: `updateProduction` steigt für ein gestopptes Gebäude sofort aus (Produktion und Arbeiter-Animation), und `destCapacity` liefert 0 (kein Nachschub - beide Zustellwege gehen durch diese Funktion). **`destCapacity` beantwortet seit v31.1 zwei verschiedene Fragen**, unterschieden über den dritten Parameter `ownWorker`: "wie viel darf hier noch ANGELIEFERT werden?" (Standard, berücksichtigt den Stopp) und "wie viel passt hier überhaupt hinein?" (der eigene, heimkehrende Arbeiter - er darf seine Fuhre immer abliefern). Welche Gebäude überhaupt einen Schalter bekommen, leitet `canPause` aus `PRODUCERS` und `PROCESSORS` ab, statt eine eigene Liste zu führen.

**Wohnhäuser haben eine STUFE, keinen eigenen Typ (v31).** `b.tier` (0-2) verweist in `HOUSE_TIERS`, dort stehen Name, Kapazität, Bedürfnisliste, Aufstiegskosten und die Einstiegsbedingung der Stufe. `tierOf`, `houseCapacity` und `tierNeeds` sind die Zugriffswege - **`b.def.capacity` gilt für Wohnhäuser NICHT mehr**, wer die Bewohnerzahl braucht, fragt `houseCapacity(b)`. Alle bestehenden `type === 'house'`-Abfragen gelten unverändert für alle drei Stufen; genau dafür ist die Stufe ein Feld und kein Typ. Die Bedürfnisprüfungen selbst (Brot, Kapelle, Wirtshaus+Bier, Kleidung, Luxus) blieben unverändert und fragen nur vorher `tierNeeds(b, ...)`; eine Stufe ohne ein Bedürfnis setzt dessen Flag ausdrücklich auf "versorgt", statt die Prüfung nur zu überspringen.

**Freischaltungen hängen am Bevölkerungs-HÖCHSTSTAND (`popPeak`, v31), nicht am aktuellen Stand.** `BUILD_UNLOCKS` ordnet einem Gebäudetyp eine Mindestbevölkerung ab einer Wohnstufe zu; geprüft wird in `canBuildHere` (damit Bauvorschau und Ferngründung mit abgedeckt sind) und angezeigt über `updateBuildMenuLocks`. `popPeak` wird dort aufgefrischt, wo Bevölkerung entstehen kann (Wachstum, Aufstieg, Laden) - **nicht** in `unlockInfo` selbst, denn die läuft über die Bauvorschau in jedem Bild.

**Die Darstellung hat drei DETAILSTUFEN (`viewDetail`, v31), die allein an der Kachelbreite hängen.** Stufe 2 ist der bisherige Look, Stufe 1 lässt Kleinkram weg (Wellen, Bodendetails, Bäume ab dem dritten), Stufe 0 zeichnet das Gelände als EIN Bild und alle Gebäude als Silhouette. `viewDetail` wird einmal je `render()` gesetzt; Zeichenfunktionen fragen es ab, statt selbst zu rechnen. **Wer eine neue Zeichenfunktion je Kachel einführt, muss sich fragen, ab welcher Stufe sie entfällt** - bei 15000 sichtbaren Kacheln kostet auch ein einzelner Pfad je Kachel ein ganzes Bild.

**Bodenschätze werden an GENAU EINER Stelle abgebaut: `extractFromTile(x, y, good)` (v30).** Stein, Eisen und Gold sind endlich; die Funktion zieht eine Fuhre ab und entscheidet zugleich, ob die Gebirgskachel zu Grasland wird (erst wenn Stein UND Eisen UND Gold auf 0 stehen). Wer eine weitere Abbauform einführt, ruft sie auf, statt `map[y][x].stone--` zu schreiben - sonst gäbe es Berge, die nie verschwinden, oder Kacheln, die halb abgebaut zu Wiese werden. Das ist die einzige Stelle im Spiel, an der sich das Gelände dauerhaft ändert; `computeIslands()` bleibt davon unberührt, weil aus Gebirge Land wird und nie Wasser.

**Der Handel am Kontor (v30) ist die einzige Senke für Münzen und die einzige Quelle für Waren ohne Produktion.** `sellPriceAt`/`buyPriceAt` berechnen den Preis je Insel aus `GOOD_BASE_PRICE`, `GOOD_ORIGIN` (welche Klimazonen können die Ware erzeugen?) und zwei Faktoren; `tradeSell`/`tradeBuy` sind die einzigen mutierenden Funktionen und klemmen wie `shipLoad`/`shipUnload`. **Wer eine neue Ware einführt, muss sie in `GOOD_BASE_PRICE` eintragen** - fehlt sie dort, ist sie stillschweigend nicht handelbar (`isTradeable`). Das ist bewusst so: Münzen selbst dürfen nie in der Liste stehen.

**Das Klima ist eine reine Funktion der y-Koordinate (v24).** Es beeinflusst seit v25 auch eine Spielregel, aber ausschließlich über `def.climates` in `canBuildHere` – nirgends sonst hängt eine Formel von der Kartenposition ab, und das sollte so bleiben.

**Ein Erzeuger-Typ kann MEHRERE Waren liefern (seit v29, richtig behandelt seit v29.2).** Die Mine steht zweimal in `PRODUCERS` (Eisen und Gold). Wer diese Tabelle ausliest, muss `producerGoodsOf(type)` benutzen statt `PRODUCERS.find(...)` – der einzelne `find` lieferte stillschweigend nur Eisen, wodurch gefördertes Gold nie abgeholt wurde. `currentProducerGood(b)` beantwortet dazu die Anzeigefrage: was fördert DIESES Gebäude gerade?

**Der Warenfluss folgt EINER Regel für alle Absender: kürzester Weg gewinnt** (`chooseDeliveryTarget`). Die Gegenrichtung (`pickWarehouseDelivery`) ordnet zuerst nach DRINGLICHKEIT, seit v33.1 dann nach WEGLÄNGE und erst bei Gleichstand reihum - siehe eigenen Technischen Hinweis, insbesondere die Begründung, warum die Entfernung als zweites Kriterium niemanden verhungern lässt.

**Die Warenliste hat genau EINE Quelle der Wahrheit:** `GOOD_LABELS` definiert die Warentypen, `emptyStorage()` leitet daraus jedes frische Warenobjekt ab, `updateResourceUI` füllt die Pillen generisch. Wer eine Ware ergänzt, braucht: `GOOD_LABELS`, eine CSS-Farbvariable + `.swatch`-Regel, eine Pille in der Topbar und einen Eintrag in `GOOD_COLORS`.

**Alle Comicfiguren teilen sich EINE Größenkonstante (`MONSTER_BASE_SCALE`).**

**Bauen läuft komplett über `canBuildHere(gx, gy, tool, opts)`**: eine einzige, nebenwirkungsfreie Prüffunktion, die sowohl die Bau-Aktionen als auch die Bauvorschau als auch die Ferngründung nutzen. `opts.ignoreCost` schaltet NUR die Bezahlprüfung ab. Straßenanschluss ist bewusst KEINE Bauregel darin. Das Setzen selbst steckt in `createBuilding` (prüft und bezahlt nicht) – `tryPlaceBuilding` ist die prüfende, bezahlende Hülle darum.

**Ein gemeinsam genutzter Vorrat sollte, wo immer möglich, EIN geteiltes Objekt sein**, seit v25 pro Insel.

**Eine feste Array-Reihenfolge ist keine faire Priorität (WICHTIG, war zweimal Quelle eines Bugs).** Sammeln, nach Dringlichkeit ordnen, bei Gleichstand reihum.

**Ein neues Bedürfnis muss nicht zwingend Bewohner kosten (v23, bestätigt v25).** Kleidung und Luxus sind Wachstumsschranken.

**Eine ODER-Liste ist die billigste Art, eine neue Ware sinnvoll zu machen (v27).** `POP_FOOD_GOODS` und `LUXURY_GOODS` sind Listen gleichwertiger Alternativen. Der Pelzmantel wurde dadurch mit EINEM Listeneintrag zu einem vollwertigen Luxusgut, ohne dass die Bedürfnislogik angefasst werden musste - und ohne ein viertes Bedürfnis, das jedes bestehende Dorf betroffen hätte. **Wer eine neue Ware einführt, sollte zuerst prüfen, ob sie in eine bestehende ODER-Liste passt, bevor er eine neue Mechanik entwirft.**

**Infopanel-Grundsatz:** Ein abgeleiteter Status allein reicht nicht, wenn er von mehreren unabhängigen Voraussetzungen abhängt – dann die Rohwerte einzeln zeigen. Hat ein Status eine ANDERE Konsequenz als die daneben stehenden, muss der Text das sagen und die Badge-Farbe es mittragen.

**Große Karten verlangen, dass nichts mehr „über alle Kacheln" läuft (v24).** `computeIslands()` und `findSeaRoute()` sind die bewussten Ausnahmen: beide gehen über die ganze Karte, laufen aber nur bei Kartenerzeugung/Laden bzw. beim Kurssetzen eines Schiffs – nie pro Frame.

**Zustand vs. Zustandslosigkeit vs. „ungespeichert" vs. „gespeichert" – eine bewusste VIERTEILUNG:**
1. **Pro Gebäude, echter Zustand, GESPEICHERT** – Schafe (`b.sheep`).
2. **Komplett zustandslos** – Hühner, springende Fische, Möwen, Treibeis, Bodendetails.
3. **Echter Zustand, bewusst NICHT gespeichert** – Rehe (`deer`), `b.noRoadTimer`, `b.working`/`b.workAnim`, `b.deliveryCursor`, die Wegpunkte eines Schiffs (`s.waypoints`), seit v29.1 die **Walfangboote** (`whaleBoats` - eine unterbrochene Jagd wird nach dem Laden einfach neu begonnen) und seit v29 das **Wetter** (`weather`/`weatherParticles`): es hat keinerlei dauerhafte Folgen, verlangsamt nur solange es läuft, und nach dem Laden beginnt schlicht eine neue Schönwetterphase.
4. **Global, echter Zustand, GESPEICHERT** – Schiffe (`ships`) samt Ladung und Routeneinteilung, die Insel-Vorräte (`islandStorages`) und die Frachtrouten (`routes`).
Berechnet und daher in KEINER dieser Kategorien: Klima und Inselzuordnung.

Rendering ist strikt in einen gemeinsamen Rohbau (`drawBuildingShell`) plus gebäudespezifische Detailzeichnung aufgeteilt. Frei bewegliche Objekte werden nach allen Kacheln gezeichnet; die ortsfesten Verarbeiter-Arbeiter INNERHALB der Gebäudezeichnung. Zeichenreihenfolge in `render()`: Kacheln (inkl. Gebäude + Arbeiter) → Ambient-Leben → Rehe → Schiffe → Schafe → Träger → Tageslicht-Schleier → Einzugsradius → Bauvorschau.

Audio läuft unabhängig vom Spielzustand in einem eigenen `AudioEngine`-Modul. **Die Engine kennt die Karte NICHT:** ob ein Geräusch ausgelöst wird, entscheidet die Spiellogik anhand der Sichtbarkeit. Einzige Ausnahme ist die Brandung (`setSurfLevel(0..1)`).

## Technischer Hinweis: Ein Verbrauch, der einmal je Nacht statt laufend zieht (NEU, v34)
Fast jeder Verbrauch im Spiel (Nahrung, Bier, Kleidung, Luxus, Glaube) läuft über ein festes Intervall in Millisekunden (`POP_CONSUME_INTERVAL` & Co.) - ein Timer zählt hoch, bei Ablauf wird verbraucht. Der Leuchtturm brauchte etwas anderes: "einmal je Nacht" ist kein Intervall, sondern ein WIEDERKEHRENDES EREIGNIS auf einer bereits vorhandenen, zyklischen Größe (`dayTime`, 0..1 je Tag). Die Lösung merkt sich den `dayTime`-Wert vom letzten Aufruf (`lastDayTimeForLighthouse`) und löst nur aus, wenn der aktuelle Wert die Schwelle 0,75 (Sonnenuntergang) VON UNTEN erreicht hat, seit dem letzten Mal. Die Bedingung `cur >= prev && prev < 0.75 && cur >= 0.75` ist dabei bewusst so geschrieben, dass sie den Rücksprung von knapp unter 1 auf knapp über 0 (Mitternacht, `cur < prev`) NICHT als Vorwärtsschritt missversteht - ohne dieses `cur >= prev` würde jeder Tageswechsel das Ereignis zusätzlich auslösen. Nach dem Laden eines Spielstands wird der Merkwert ausdrücklich auf die geladene Uhrzeit zurückgesetzt (`applySave`), sonst könnte ein Sprung über die Schwelle beim Laden selbst einen Verbrauch auslösen oder einen echten verschlucken.

## Technischer Hinweis: Baukosten über mehrere Waren, nicht nur Bretter (NEU, v34)
Bis v34 zahlte JEDES Gebäude ausschließlich in Brettern - `canBuildHere` und `tryPlaceBuilding` lasen deshalb hart `def.cost.plank`. Der Leuchtturm (Bretter UND Stein) brauchte eine zweite Ware im Preis; statt eines Sonderfalls nur für ihn laufen beide Stellen jetzt über `for (const good in def.cost)`. Die Lehre, die sich hier wiederholt (siehe auch `emptyStorage()`/`GOOD_LABELS` als einzige Warenliste): **eine Datenstruktur, die schon ein Objekt statt eines Einzelwerts ist (`cost: { plank: N }`), sollte von Anfang an generisch gelesen werden - der Tag, an dem ein zweites Feld dazukommt, kommt zuverlässig.**

## Technischer Hinweis: Die Taktrate ist keine Produktionsrate (NEU, v33.1)
**`def.interval` sagt, wie oft ein Betrieb einen Vorgang ANSTÖSST - nicht, wie viel er liefert.** Gemessen: Verarbeiter erreichen 94 % ihrer Taktrate (sie stehen still und arbeiten), Erzeuger dagegen nur 12-25 %, weil ihr Arbeiter zum Baum, zum Feld oder ans Ufer läuft und wieder zurück. Der Weg dominiert die Zykluszeit, das Intervall ist nur ein kleiner Teil davon.

**Wer eine Verbrauchszahl an der Taktrate ausrichtet, stellt sie um den Faktor vier bis acht zu hoch ein.** Genau das war passiert: eine vollständige Brotkette ernährte sieben Bewohner. Für jede Zahl, die gegen eine Produktionsrate gerechnet wird, gilt deshalb: **erst messen, dann setzen** - und zwar die ganze Kette im Spiel, nicht die Zahl in der Definition.

**Eine Messung ist auch die beste Erklärung.** "Eine Kette ernährt 7 Bewohner, nach der Änderung 53" ist eine Aussage, über die man entscheiden kann; "der Verbrauch fühlt sich zu hoch an" ist es nicht. Die Messskripte gehören deshalb zum Vorgehen, auch wenn sie danach wieder gelöscht werden.

## Technischer Hinweis: Eine Einnahme, die eine Entscheidung sein soll (NEU, v33)
**Ein reiner Zufluss ist keine Spielmechanik.** Steuern, die einfach nur Geld bringen, machen "mehr Bewohner" schlicht immer besser. Erst der Regler mit einem PREIS (hoher Satz = kein Wachstum, kein Aufstieg) macht daraus eine Abwägung - und weil er je Insel gilt, entstehen Muster statt einer globalen Einstellung, die man einmal setzt und vergisst.

**Der Ertrag gehört an die vorhandene Fortschrittsachse.** Er hängt an der Wohnstufe, nicht an der Kopfzahl: damit zahlt der Aufstieg aus v31 auf die Steuern ein, statt eine zweite, unabhängige Kennzahl aufzumachen. Eine neue Mechanik, die eine bestehende verstärkt, ist fast immer besser als eine, die neben ihr steht.

**Eine neue Regel darf ein bestehendes Dorf nicht rückwirkend schrumpfen lassen.** Hohe Steuern kosten deshalb nie Bewohner, sondern halten nur an - dieselbe Entscheidung wie bei Kleidung (v23) und Luxus (v25). Wer die Regel einführt, muss sich fragen: was passiert mit einem Spielstand, der sie noch nicht kannte?

**Wo eine Einstellung wohnt, entscheidet, ob sie gefunden wird.** Der Steuersatz steht an ZWEI Orten (Kontor der Insel und Warenübersicht mit allen Inseln nebeneinander), das Hauspanel zeigt nur die WIRKUNG. Die Regel dahinter: die Einstellung dorthin, wo man sie sucht; die Folge dorthin, wo man sie bemerkt.

## Technischer Hinweis: Automatisches Speichern (NEU, v33)
**Der Serialisierer war seit v20 fertig - es fehlte nur ein zweiter Abnehmer.** Wer ein Speicherformat hat, bekommt Autosave fast geschenkt; die Arbeit steckt nicht im Speichern, sondern im Umgang mit dem Gefundenen beim Start.

**Beim Start FRAGEN, nicht entscheiden.** Automatisch fortzusetzen überstimmt jede Absicht, neu anzufangen; den Stand zu ignorieren wäre der ganze Sinn des Autosaves. Die frische Karte läuft während der Frage schon im Hintergrund - der Spieler sieht, dass das Spiel funktioniert, und "Fortsetzen" ersetzt sie vollständig über `applySave`.

**Browser-Speicher ist nicht garantiert.** Die Datei wird per Doppelklick geöffnet (file://), und dort ist localStorage in manchen Browsern gesperrt. JEDER Zugriff steckt deshalb in try/catch, und nach dem ersten Fehlschlag wird nicht wieder versucht: eine Fehlermeldung alle 30 Sekunden wäre schlimmer als kein Autosave. Ein beschädigter Eintrag (abgeschnittenes JSON) darf den Start nicht verhindern - `readAutosave` gibt in dem Fall schlicht null zurück.

**"Neu anfangen" löscht den alten Stand NICHT sofort.** Der nächste Autosave überschreibt ihn ohnehin; solange aber nichts gebaut ist, hätte ein Fehlklick sonst einen ganzen Spielstand vernichtet. Ein Löschen, das man nicht rückgängig machen kann, sollte nie die Nebenwirkung einer harmlosen Wahl sein.

## Technischer Hinweis: Von zwei Enden zu einer Liste (NEU, v32)
**Wenn aus "genau zwei" plötzlich "beliebig viele" wird, ist die richtige Frage nicht "wie erweitere ich die Felder?", sondern "welche EINE Regel erzeugt beides?".** Die alte Route hatte vier Felder für zwei Enden plus je eine Ware und Menge für Hin- und Rückweg. Naheliegend wäre gewesen, jeder Station ein Lade- UND ein Abladefeld zu geben. Stattdessen sagt eine Station nur, was dort GELADEN wird; abgeladen wird alles andere. Das Ergebnis ist deckungsgleich mit dem alten Verhalten (zwei Stationen = Hin- und Rückfracht), braucht aber die Hälfte der Einstellungen und macht die Migration alter Spielstände zu einer reinen Umformung ohne Verhaltensänderung.

**Dieselbe Vereinfachung greift beim Zustandsautomaten.** Aus zwei benannten Beinen ('a'/'b') wird ein Index. Ein benannter Sonderfall weniger heißt: eine Verzweigung weniger an jeder Stelle, die den Zustand liest, und der Pendelverkehr ergibt sich als Spezialfall statt als eigener Codepfad.

**Ein Zwischenzustand, den der Nutzer durchlaufen MUSS, darf nicht verboten sein.** Eine Sternfahrt (A → B → A → C) entsteht, indem man an A → B erst A und dann C anhängt - und `A → B → A` hat als Rundkurs die Naht A → A, also einen Doppelhalt. Diesen Zwischenschritt zu verbieten hätte das Ziel unerreichbar gemacht. **Die Lösung gehört in den Automaten, nicht in die Prüfung:** er überspringt beim Weiterzählen jeden Halt am selben Kai wie der gerade erledigte. Damit ist ein Doppelhalt harmlos statt verboten - und derselbe Mechanismus fängt auch den Fall ab, dass durch das Wegfallen eines Kontors zwei gleiche Halte aneinandergeraten. **Faustregel: eine Regel, die einen Zwischenzustand verbietet, macht das Ziel unerreichbar; eine Regel, die ihn toleriert, macht es nur unordentlich.**

**Beim Erweitern einer Beziehung von 1:1 auf 1:n gehört JEDE Stelle auf die Liste, die die alte Annahme trägt** - nicht nur die offensichtliche. Hier war `updateRoutes` die offensichtliche und `removeBuilding` die vergessene: dort stand weiterhin "Kontor weg = alle seine Routen weg", was mit einer Stationsliste falsch ist. Gefunden hat es der Test, der ausdrücklich prüfte, dass eine Route den Wegfall EINER Station überlebt. Dieselbe Lehre wie bei `PRODUCERS` in v29.2, nur an anderer Stelle.

## Technischer Hinweis: Etwas abschalten heißt mehr als "nicht mehr rechnen" (NEU, v31.1)
Ein Schalter, der nur die Produktion anhält, ist halb fertig. Dazu gehören drei weitere Fragen, und jede hat eine eigene Antwort:

**Was passiert mit dem Nachschub?** Er muss ausbleiben, sonst füllt sich ein stillstehender Betrieb mit Waren, die anderswo fehlen - und genau das ist meist der Grund, warum jemand etwas abschaltet. Der Eingriff gehört an die Stelle, durch die ALLE Zustellwege laufen (hier `destCapacity`), nicht in jeden einzelnen Aufrufer.

**Was passiert mit dem, was schon da ist?** Fertige Ware muss weiter abgeholt werden (sonst wird aus dem Stopp ein Lagerbau), und angefangene Arbeit muss zu Ende gehen dürfen (sonst verschwindet ein Arbeiter mitten auf dem Feld).

**Wie sieht ein abgeschaltetes Gebäude aus?** Es muss STILLSTEHEN: bewegte Teile einfrieren, Rauch aus, Arbeiterfigur weg. Ein Sägewerk mit rotierendem Blatt, das nichts produziert, liest sich als Fehler. Und es braucht ein eigenes Zeichen, das sich vom Mangel-Alarm unterscheidet - ein Alarm schickt den Spieler auf Fehlersuche, ein Stopp war seine eigene Entscheidung. Nur der drohende Verfall (kein Straßenanschluss) geht dem Pausenzeichen vor.

Für das Einfrieren wird `animClock` innerhalb von `drawBuilding` durch eine gebäudeeigene Uhr ersetzt (`b.pauseClock`, reine Anzeige, nicht gespeichert). Sie hält den STAND fest, statt auf 0 zu springen - sonst zuckte jedes Gebäude beim Abschalten in eine andere Stellung.

## Technischer Hinweis: Stufen an einem bestehenden Objekt (NEU, v31)
**Wenn ein Objekt Varianten bekommt, ist ein FELD fast immer besser als ein neuer Typ.** Drei Haustypen hätten Einträge in fünf Tabellen und in jeder `type === 'house'`-Abfrage gebraucht, und der Aufstieg hätte ein Gebäude löschen und ein neues bauen müssen - mit allem, was daran hängt (Bewohner, Timer, Straßenanschluss, Auswahl im Infopanel). Ein Zahlenfeld macht den Aufstieg zu einer Zuweisung und lässt jede bestehende Abfrage weitergelten. Der Preis ist eine Nachschlagetabelle (`HOUSE_TIERS`) und die Disziplin, Kapazität und Bedürfnisse NUR über sie zu lesen.

**Ein Fortschritt darf nie unmittelbar bestraft werden.** Ein Haus, das zu Bürgern aufsteigt und danach mangels Wirtshaus Bewohner verliert, ist aus Spielersicht ein Fehler, auch wenn jede einzelne Regel korrekt greift. Deshalb prüft der Aufstieg die Einstiegsbedingung der NÄCHSTEN Stufe, bevor er passiert. Als Nebenwirkung erklärt das Infopanel damit von selbst, was als Nächstes zu tun ist.

**Eine Freischaltung, die sich wieder schließt, ist eine Falle.** Deshalb entscheidet der gespeicherte HÖCHSTSTAND der Bevölkerung, nicht der aktuelle. Sonst nähme eine Hungersnot dem Spieler mitten im Spiel die Tabakfarm aus dem Baumenü - und damit die Kette, mit der er die Hungersnot beheben könnte.

**Eine Abhängigkeitskette darf keinen Kreis bilden.** Kaufleute verlangen Tabak oder Gewürze; hinge die Plantage an der Zahl der KAUFLEUTE, käme man nie hinein. Sie hängt deshalb an den Bürgern - eine Stufe früher, als sie gebraucht wird.

## Technischer Hinweis: Zeichnen nach Entfernung (NEU, v31)
**Beim Herauszoomen wächst die Zahl sichtbarer Kacheln quadratisch, ihre Größe sinkt linear.** Bei Zoom 0,25 liegen über 15000 Kacheln im Bild, jede wenige Pixel groß. Einen Baumstamm von 0,4 Pixeln zu zeichnen kostet genauso viel wie bei voller Größe. Detailstufen (`viewDetail`, Schwellen bei 34 und 26 Pixel Kachelbreite) sind deshalb keine Kür, sondern Voraussetzung dafür, dass eine große Karte überhaupt herausgezoomt werden kann.

**Detailstufen allein reichen aber nicht: die Zahl der PFADE bleibt.** Selbst auf die nackte gefüllte Raute reduziert kosteten 15000 Kacheln 31 ms. Der Ausweg ist ein Wechsel der Darstellungsart: **die isometrische Projektion ist eine LINEARE Abbildung des Kachelgitters**, also lässt sich das Gelände als gewöhnliches Bild (Pixel je Kachel) zeichnen und mit einem einzigen `ctx.transform` + `drawImage` in die Rautenansicht kippen. Die Matrix `(tw/2, th/2, -tw/2, th/2, ox, oy - th/2)` bildet Bildpunkt (x,y) genau auf `gridToScreen` ab; das `-th/2` gleicht aus, dass ein Bildpixel die Kachel-FLÄCHE abdeckt, `gridToScreen` aber ihren MITTELPUNKT liefert. **`ctx.transform`, nicht `setTransform`** - die Grundmatrix trägt den Geräte-Pixelfaktor, sie zu überschreiben setzt das Bild auf Retina-Bildschirmen auf halber Größe in die Ecke.

**Zwei Bildpunkte je Kachelkante statt einem** tragen keine zusätzliche Information, halbieren aber den Vergrößerungsfaktor: die weiche Interpolation wirkt dann nur im Saum zwischen zwei Kacheln statt über die ganze Fläche. Der Puffer wird höchstens alle 350 ms neu gefüllt - Gelände ändert sich beim Bauen, nicht je Bild.

**Was aus der Ferne wegfällt, ist eine Entwurfsfrage, keine rein technische.** Weg können Bäume, Wellen, Bodendetails, Hühner, Rehe, Schafe und alle Gebäudedetails. Bleiben MÜSSEN die Dinge, wegen derer man überhaupt herauszoomt: wo steht was (Silhouette in Typfarbe), wo fehlt etwas (der Mangel-Punkt über dem Haus), wo liegt Erz, wo ist schon abgeholzt (Farbabstufung im Geländebild) und wo fährt ein Schiff.

## Technischer Hinweis: Ein Zwischenspeicher kann langsamer sein als die Rechnung (NEU, v31)
`getOrigin()` und `currentTileSize()` liefern jetzt gemerkte Objekte, statt bei jedem der über 50000 Aufrufe je Bild ein neues zu erzeugen. Die erste Fassung war damit **messbar LANGSAMER** - weil der Vergleich, ob der Zwischenspeicher noch gilt, `canvas.clientWidth` las: ein Layout-Zugriff, den `currentTileSize` vorher gar nicht hatte. Erst als auch die Fenstergröße gemerkt wurde (aufgefrischt beim Größenwechsel und einmal je `render()`), kippte die Messung ins Positive.

**Die Lehre gilt allgemein: eine Optimierung ohne Vorher-Nachher-Messung ist eine Vermutung.** Und die Messung muss den ALTEN Build im SELBEN Browser gegen den neuen stellen, abwechselnd und über den Median mehrerer Läufe - Einzelmessungen schwanken in einem Container um mehr als der gesuchte Effekt.

## Technischer Hinweis: Endliche Vorkommen (NEU, v30)
**Eine Ressource endlich zu machen ist keine Bilanz-, sondern eine Zustandsänderung.** Der Vorrat sinkt nicht nur - irgendwann ändert sich das GELÄNDE. Deshalb gibt es `extractFromTile` als einzige Abbaustelle: Abzug und Geländewechsel gehören untrennbar zusammen, und zwei Aufrufer (Mine und Steinbruch) würden die Umwandlung sonst garantiert unterschiedlich implementieren.

**Der Berg darf erst verschwinden, wenn ALLES weg ist.** Eine leere Ader in einem noch massiven Fels ist ein völlig normaler Zustand - sie liegt ja IM Gestein. Wer nur „Ader leer → Kachel weg" prüft, löscht dem Spieler seinen Steinbruch unter der Hand weg.

**Endlichkeit ohne sichtbare Rückmeldung ist ein Bug, kein Feature.** Ein zu 90 % abgetragener Berg muss anders aussehen als ein unberührter, sonst steht der Spieler unvermittelt vor einer Kachel, die kommentarlos zu Wiese geworden ist. `drawMountainRock` bekommt darum den Restvorrat: Brocken tragen ein `keepAt` (ab welchem Füllstand sie noch da sind), der letzte schrumpft zusätzlich - aber nie unter 55 %, weil er sonst unbemerkt verschwände, statt sichtbar abgetragen zu werden. Dazu die Zahl im Infopanel und eine ausdrückliche Meldung „erschöpft".

**Endlichkeit sprengt in aller Regel das Speicherformat.** Was als eine Ziffer je Kachel kodiert war, passt bei dreistelligen Vorräten nicht mehr. Die Sparse-Liste ist hier sogar sparsamer, weil nur ein paar hundert von 19600 Kacheln überhaupt etwas tragen. **Beim Formatwechsel gehört der Migrationspfad in denselben Commit** - und er muss auch die Felder erfinden, die es vorher gar nicht gab (hier: Steinvorräte, die früher unbegrenzt waren).

## Technischer Hinweis: Handel und Preise (NEU, v30)
**Ein Preismodell darf winzig sein, solange es Geografie erzeugt.** Grundpreis je Ware, dazu die Frage „kann diese Insel die Ware selbst hervorbringen?" (`GOOD_ORIGIN` gegen `islands[i].climate`): ja → Faktor 0,75, nein → Faktor 1,4. Waren, die überall entstehen, kosten überall gleich. Zwei Zahlen und eine Herkunftstabelle genügen, damit Gold im Süden billig und im Norden teuer ist - jede Angebots-/Nachfragesimulation wäre hier Aufwand ohne spürbaren Gewinn.

**Der Kaufaufschlag ist eine ARBITRAGE-GRENZE, keine Geschmacksfrage.** Damit sich reines Hin- und Herkaufen zwischen zwei Inseln nicht lohnt, muss gelten: bester Verkaufsfaktor < günstigster Kauffaktor × Aufschlag, also 1,4 < 0,75 × 2,5 = 1,875. Bei einem Aufschlag von 2,0 wäre die Ungleichung verletzt und es gäbe eine Geldmaschine ohne jede Produktion. **Wer an einem der drei Werte dreht, muss diese Ungleichung nachrechnen** - ein Test tut das für jede Ware über alle Inseln.

**Dieselbe Grenze gilt für jede Ware, die Geld ERZEUGT.** Die Münzprägerei liefert 12 Münzen je Klumpen Gold: mehr als der beste Verkaufspreis für rohes Gold (11), damit Prägen sich lohnt, aber weniger als der günstigste Kaufpreis (15), damit gekauftes Gold zu prägen ein Verlust bleibt. Ohne die obere Schranke wäre der Kaufknopf selbst die Geldmaschine gewesen. Dafür bekam `PROCESSORS` ein optionales `yield`.

**Ein Panel, das sich alle 400 ms neu aufbaut, kann keinen Zustand halten.** Der Klappzustand des Handelsbereichs steckt wie der Fokus-Schutz in einer Modulvariablen ausserhalb der Render-Funktion - im DOM abgelegt wäre er beim nächsten Takt weg, und die Klappe fiele dem Spieler dreimal pro Sekunde zu.

## Technischer Hinweis: Wenn aus „eins" plötzlich „mehrere" wird (NEU, v29.2)
**Eine Tabelle, die bisher genau einen Eintrag je Schlüssel hatte, wird beim Erweitern zur Falle.** `PRODUCERS` ordnete jedem Gebäudetyp seine EINE Ware zu; mit der Mine (Eisen ODER Gold) stimmte das nicht mehr. Der Code las weiterhin mit `find` – und `find` ist der gefährlichste Fall überhaupt: er wirft keinen Fehler, liefert einen plausiblen Wert und lässt alles gesund aussehen, während die zweite Ware unsichtbar liegen bleibt. **Wer eine Zuordnung von 1:1 auf 1:n erweitert, muss JEDE Lesestelle dieser Tabelle durchgehen** (hier: Logistik, Infopanel, `destCapacity`) – die Suche nach `find` auf dem Tabellennamen ist dabei die vollständige Liste.

**Und die Anzeige ist eine eigene Lesestelle.** Dass im Infopanel „Eisen" stand, war ein zweiter, unabhängiger Fehler mit derselben Ursache. Er hätte auch dann bestanden, wenn die Logistik korrekt gewesen wäre – und war für den Nutzer sogar der auffälligere Teil der Meldung.

## Technischer Hinweis: „In Reichweite" ist nicht „angekommen" (NEU, v29.2)
**Eine Toleranz, die als BEDIENHILFE gedacht ist, darf nicht für die Automatik gelten.** `SHIP_DOCK_RANGE = 5` existiert, damit der Spieler sein Schiff nicht millimetergenau neben den Kai steuern muss. `updateRoutes` benutzte denselben Wert als Ankunftsprüfung – und ein automatisch fahrendes Schiff hielt damit fünf Kacheln vor dem Kontor auf offener See und lud dort um. Automatik und Handsteuerung brauchen hier getrennte Werte (`ROUTE_DOCK_RANGE = 1,5`).

**Ein reiner Abstandstest hält im Moment des Unterschreitens an.** Auch mit engem Wert stoppte das Schiff exakt auf der Grenze statt an der Anlegekachel. Die Ankunftsbedingung muss deshalb zusätzlich verlangen, dass der KURS abgefahren ist (kein `tx`, keine Wegpunkte mehr). **Bei allem, was sich auf ein Ziel zubewegt, ist „nah genug" eine andere Aussage als „dort" – und für die Darstellung zählt die zweite.**

## Technischer Hinweis: Eine Ware, die aus der Reihe tanzt (NEU, v29.1)
**Gilt eine Ausnahme für genau EIN Element einer Datenstruktur, gehört sie in die Datenstruktur - nicht in jeden Leser.** Die Münzen sollten kartenweit gelten, während alle anderen Waren an ihrer Insel hängen. Ein `if (good === 'coin')` in `stockOf`, `spendFrom`, `addTo`, der Träger-Zustellung, der Anzeige und den Schiffsfunktionen wäre sechsmal dieselbe Regel gewesen - und hätte garantiert eine Stelle übrig gelassen. Ein getter/setter auf dem `coin`-Feld jedes Insel-Bestands erledigt es an EINER Stelle und erwischt automatisch auch jeden künftigen Zugriffsweg.

**Ein solcher Accessor gehört NUR auf die geteilte Ebene, nie auf die lokale.** Die lokalen Warenpuffer der Gebäude entstehen aus demselben `emptyStorage()`; bekämen sie den Accessor mit, wäre der Ausgabepuffer der Münzprägerei die Staatskasse selbst - ihre Produktion würde bei acht Münzen landesweit stoppen (`outputCapacity`), und der Träger würde sich beim Aufnehmen sein eigenes Ziel leeren.

**Ein enumerierbarer getter landet im JSON.** `Object.assign({}, storage)` und `JSON.stringify` lesen ihn aus - der Münzstand hätte deshalb bei JEDER Insel in der Datei gestanden und sich beim Laden vervielfacht. Das Speicherformat schreibt `coin` deshalb ausdrücklich nicht je Insel, sondern einmal als `treasury`. **Wer ein berechnetes/geteiltes Feld einführt, muss den Serialisierer sofort mitprüfen.**

**Eine Ware, die überall gilt, darf nicht transportierbar sein.** Sonst kann der Spieler seine Kasse auf ein Schiff laden und wundert sich, wohin das Geld verschwunden ist. `UNSHIPPABLE_GOODS` filtert sie aus Umschlag-Panel und Routen-Auswahl - eine entfernte Falle, keine Einschränkung.

## Technischer Hinweis: Bewegliche Arbeit auf dem Wasser (NEU, v29.1)
**Ein Erzeuger, dessen Arbeit weit weg stattfindet, braucht keinen neuen Mechanismus - nur einen anderen Träger.** Das Walfangboot ist strukturell derselbe Ablauf wie ein Feldarbeiter: hinaus, arbeiten, zurück, und ERST bei der Rückkehr wird die Ware verbucht (sonst schickt die Logistik Träger los, während die Ware noch auf See ist). Der Unterschied liegt allein im Medium.

**Ein automatisches Fahrzeug gehört nicht in dieselbe Liste wie die des Spielers.** `ships` sind gekaufter, anklickbarer, routenfähiger Besitz; ein Walfangboot gehört seiner Hütte. Sie zu mischen hätte bedeutet, in jeder Schiffsfunktion (Auswahl, Umschlag, Routen, Speicherformat) einen Sonderfall zu prüfen. Ein eigenes, kleines Array ist billiger - dieselbe Trennung wie zwischen Trägern und Schafen.

**Wer ein Fahrzeug an ein Gebäude bindet, muss den Abriss mitdenken.** Verschwindet die Hütte, verschwindet ihr Boot (`removeWhaleBoatsOf` in `removeBuilding`), plus ein Sicherheitsnetz in der Update-Schleife - genau wie beim Lösen der `held`-Sperre eines Rehs.

## Technischer Hinweis: Wetter als Zonen-Ereignis (NEU, v29)
**Ein Wetter braucht einen ORT, nicht nur eine Zone (v29.3).** In v29 galt eine Lage für eine ganze Klimazone – damit war sie ein Bildschirmfilter, dem man nicht ausweichen konnte. Eine Lage besteht jetzt aus einer ZELLE (Mittelpunkt, Radius, weicher Rand, langsame Drift) UND der Zonenbindung; beide Bedingungen zusammen ergeben 2–6 % statt 100 % der möglichen Fläche. **Faustregel für die Größe: ungefähr ein Bildschirm.** Kleiner wirkt es wie ein Effekt, der über den Spieler hinwegblitzt, größer merkt er die Grenze nicht mehr.

**Örtlichkeit muss ANGEZEIGT werden, sonst existiert sie für den Spieler nicht.** Mit der Zelle kamen zwingend zwei Anzeigen dazu: die nächstgelegene Insel im Abzeichen und der Kreis auf der Minimap. Ohne sie sähe der Spieler nur, dass es manchmal irgendwo regnet, und könnte weder hinfahren noch ausweichen. Dasselbe gilt für den Ton: ein kartenweit gleich lautes Sturmrauschen widerspricht einer örtlichen Zelle, der Pegel folgt deshalb der Entfernung zum Bildausschnitt.

**Partikel gehören dorthin gestreut, wo der Effekt IST, nicht über den ganzen Bildschirm.** Ein festes Partikelbudget über die volle Fläche zu verteilen und dann wegzufiltern, was außerhalb liegt, sieht bei enger Zelle und weit herausgezoomter Karte nach Nieselregen aus - die Dichte hängt dann von der Zoomstufe ab statt vom Wetter. `weatherScreenBox` begrenzt den Streubereich auf die Zellfläche; liegt sie außerhalb des Bildes, entstehen gar keine Partikel.

**Ein Kreis auf der Karte ist eine Ellipse auf dem Schirm.** Für den flächigen Schleier wird deshalb nicht der Gradient verbogen, sondern die Zeichenfläche um den Mittelpunkt senkrecht gestaucht (`ctx.scale(1, 0.5)`) - danach ist es ein gewöhnlicher radialer Verlauf, der exakt dieselbe Fläche abdeckt wie `weatherCellFalloff` für die Spielregel.

**Eine Wetterlage gleichzeitig, und ihre Region gehört als DATENFELD an die Lage.** Mehrere überlagerte Wetter sind weder zeichnerisch noch spielerisch lesbar – der Spieler muss auf einen Blick sagen können, warum sein Schiff kriecht. Jede Lage in `WEATHER_KINDS` trägt deshalb `region` (`polar`/`north`/`sea`) und `shipFactor`; `inWeatherRegion` ist die EINE Stelle, die Bild und Spielregel gemeinsam benutzen. Sonst kann es passieren, dass es sichtbar schneit, wo nichts gebremst wird.

**Ein Effekt, der die Spielgeschwindigkeit verändert, braucht eine ANZEIGE.** Die Karte allein reicht nicht: die Kamera kann ganz woanders stehen als das betroffene Schiff. Deshalb das Wetter-Abzeichen in der Titelzeile, das nur bei laufendem Ereignis erscheint und im Tooltip Region und Bremswirkung nennt.

**Regeln diskret, Darstellung stufenlos (Fortsetzung der v24-Lehre).** `climateAt` ist eine Ja/Nein-Entscheidung – daran hängt, ob gebremst wird. Fürs BILD wird dagegen der stufenlose `climateMix` benutzt, sonst hört das Schneetreiben entlang einer schnurgeraden Diagonale schlagartig auf. Genau dieser Fehler stand im ersten Bildtest.

**Zwei Darstellungsverfahren für zwei Aufgaben.** Partikel (Regen, Schnee) leben in SCHIRMkoordinaten, damit sie beim Verschieben der Karte nicht mitwandern; ob ein einzelner Tropfen gezeichnet wird, entscheidet trotzdem die Karte darunter (`screenToGrid` + `inWeatherRegion`) – so regnet es wirklich nur über Wasser, ganz ohne Maske. Flächiges Wetter (Nebel) ist dagegen ein linearer VERLAUF: eine Zeile konstanter Kartenhöhe ist in der Iso-Projektion eine Gerade auf dem Schirm, ein Gradient senkrecht dazu genügt also – kein Clipping, kein Pfad je Kachel.

**Ortsabhängige Effekte multiplizieren, nicht schalten.** `weatherShipFactor(x, y)` mischt den Bremsfaktor über die Intensität ein (`1 - (1 - factor) * intensity`), damit ein aufziehender Sturm die Fahrt allmählich zäher macht. Ein hart geschalteter Faktor hätte sich wie ein Ruck angefühlt.

## Technischer Hinweis: Zwei Erze in einer Mine (NEU, v29)
**Welche Ressource eine Kachel liefert, beantwortet EINE Funktion** (`oreOfTile`). Kartenerzeugung, Förderlogik, Felszeichnung und Speicherformat fragen alle dort – sonst driften sie auseinander, und die Mine baut Gold ab, wo der Fels rostig gesprenkelt ist.

**Ein zweites Vorkommen sollte das erste ERSETZEN, nicht ergänzen.** Gold liegt ausschließlich im Süden, Eisen ausschließlich außerhalb. Dadurch hat jede Zone etwas, das die andere nicht hat (kein Werkzeug im Süden, kein Geld im Norden) – ein zusätzlich gestreutes Gold hätte dagegen nur die Karte voller gemacht, ohne eine einzige Entscheidung zu erzeugen.

**Ein Vorkommen, an dem eine Kernmechanik hängt, braucht eine Zusicherung.** Der Zufallslauf zeigte zwei von acht Karten ganz ohne Gold – bei Gold als Grundlage des Geldes ist das keine schwierige, sondern eine kaputte Karte. `ensureGoldSomewhere` setzt notfalls ein Massiv und garantiert Adern (dieselbe Lehre wie bei der Startinsel in v24). **Und so etwas findet man nur über Statistik aus mehreren Durchläufen, nie über einen einzelnen Blick auf eine erzeugte Karte.**

## Technischer Hinweis: Kontor, Ferngründung und Frachtrouten (NEU, v26)
**Eine Wirtschaftsregel, die eine Ressource an einen Ort bindet, braucht genau EINEN Weg, diesen Kreis zu durchbrechen.** Seit v25 kostet Bauen Ware der Zielinsel – auf einer unbesiedelten Insel also unmöglich. Die Kontor-Gründung aus der Schiffsladung ist dieser eine Weg, und sie ist bewusst der einzige. Wer eine ähnliche Sperre einführt, sollte zuerst den Durchbruch entwerfen, nicht die Sperre.

**Für eine Ausnahme von einer Bauregel niemals eine zweite Prüffunktion schreiben.** Die Ferngründung braucht alle Geländeregeln, aber nicht die Bezahlprüfung. Ein Parameter (`opts.ignoreCost`) an der bestehenden `canBuildHere` hält die Regeln an EINER Stelle; eine parallele Prüffunktion wäre über kurz oder lang von der ersten abgewichen, und dann hätte die Bauvorschau etwas anderes gesagt als die Wirklichkeit. Dasselbe Prinzip beim Setzen: `createBuilding` ist der gemeinsame Kern, `tryPlaceBuilding` nur die prüfende, bezahlende Hülle.

**„An der Küste" und „am Wasser" sind zwei verschiedene Bedingungen.** Wasser im UMKREIS (`needsWater` + `radius`) heißt „in Reichweite", Wasser DIREKT DANEBEN (`needsCoast` + `isCoastTile`, 4er-Nachbarschaft) heißt „berührt das Ufer". Diagonale Nachbarschaft wäre bei der zweiten falsch: eine nur über die Ecke berührte Wasserkachel ist keine Anlegestelle. **Welche Bedingung gilt, entscheidet der ZWECK, nicht die Optik:** wer anlegt, braucht die Küstenpflicht (Hafen und Kontor, seit v26.2 beide), wer nur hingeht, die Umkreisregel (Fischerhütte). Der Test muss die beiden Regeln gegeneinander prüfen – eine Kachel zwei Felder landeinwärts, auf der die Fischerhütte erlaubt und Hafen wie Kontor abgelehnt werden, ist der eigentliche Nachweis.

**Eine Requisite, die eine Richtung behauptet, muss die echte Richtung zeigen (v26.2).** Der Steg des Hafens lief fest nach Südwesten. Das war tolerierbar, solange ein Hafen irgendwo im Hinterland stehen durfte – mit der Küstenpflicht wurde daraus ein sichtbarer Fehler. Beim Ausrichten an einer Nachbarkachel sind in der Isometrie zwei Dinge zu beachten: die Zeichenreihenfolge (eine Requisite nach hinten muss VOR dem Gebäude gezeichnet werden, sonst liegt sie darüber) und die Auswahl bei mehreren gültigen Richtungen (die vordere gewinnt, sonst versteckt das Haus das Erkennungsmerkmal).

**„Höchstens eines je X" macht ein Gebäude adressierbar.** Weil es je Insel nur ein Kontor gibt, ist eine Route eindeutig „Heimatinsel → Aldfell" statt „Kontor #3 → Kontor #7". Diese Einmaligkeit ist keine Balancing-Entscheidung, sondern die Voraussetzung dafür, dass die Oberfläche in Inselnamen sprechen kann.

**Eine Route gehört an die Stations-GEBÄUDE, nicht an Inseln oder Schiffe.** Gespeichert werden die Kachelkoordinaten der Kontore; verschwindet eines, verliert die Route diesen Halt (seit v32 - vorher starb sie ganz) und wird erst unter zwei Stationen gelöscht. Die Aufräumung steht doppelt im Code – sofort in `removeBuilding` (damit ein offenes Infopanel nicht kurz eine tote Station zeigt) und als Sicherheitsnetz in `updateRoutes`.

**Ein Transportautomat braucht so wenige Zustände wie möglich.** Seit v32 ist es EIN Zustand: die Nummer der nächsten Station plus ein Pausentimer. (Bis v31.1 waren es zwei Beine 'a'/'b' - der Pendelverkehr ist jetzt der Sonderfall "zwei Stationen" und braucht keine eigene Zeile mehr.) Wichtig sind drei Details: (1) einen neuen Kurs nur setzen, wenn das Schiff wirklich STILLSTEHT – sonst liefe jede Sekunde eine neue Wegsuche, und ein vom Spieler von Hand verschobenes Schiff käme nie an; (2) bei der Ankunft den Restkurs verwerfen, sonst fährt das Schiff nach dem Umschlag erst die alten Wegpunkte zu Ende; (3) beim Umschlag die Anlegestelle ausdrücklich mitgeben, sonst schlägt ein zufällig näher liegender zweiter Hafen auf der falschen Insel um.

**Eine Wegsuche über Wasser lohnt sich erst mit Glättung.** Eine reine 4er-Breitensuche liefert einen Treppenweg; Schiffe bewegen sich aber frei. `smoothSeaRoute` springt vom aktuellen Punkt so weit voraus, wie die Sichtlinie über Wasser reicht. **Die Vorausschau MUSS begrenzt sein** (`SEA_SMOOTH_LOOKAHEAD = 30`): ohne Grenze ist die Glättung quadratisch in der Weglänge, und jeder Sichtlinientest kostet selbst schon Abtastschritte. Gemessen mit Grenze: 2,1 ms über 90 Kacheln.

**Ein Panel, das sich selbst regelmäßig neu aufbaut, darf das nicht tun, während der Spieler darin etwas auswählt.** Der 400-ms-Takt des Infopanels pausiert, solange der Fokus in einer `<select>` darin steht – sonst schnappt das geöffnete Auswahlmenü mitten im Klick zu. Gilt für jedes künftige interaktive Element im Panel.

## Technischer Hinweis: Inselwirtschaft & Schiffsfracht (v25)
**Abgeleiteter Zustand gehört berechnet, nicht gespeichert.** Die Inselzuordnung ist – wie das Klima in v24 – vollständig aus der Karte ableitbar. `computeIslands()` nach `generateMap()` und nach `applySave()` kostet zwei Durchläufe pro Sitzung und macht Speicherformat-Eingriffe und Inkonsistenzen unmöglich.

**Die Flood-Fill MUSS dieselbe Nachbarschaft benutzen wie die Pfadsuche** (4er). „Gleiche Insel" muss deckungsgleich mit „zu Fuß erreichbar" sein. Dasselbe gilt seit v26 für die Seewegsuche.

**Ein globaler Vorrat wird zu N Vorräten, indem man den Zugriff kapselt, nicht indem man die Logik umschreibt.** NIE direkt auf `islands[i].storage` zugreifen, außer beim Anlegen.

**Der Bezugspunkt einer Anzeige muss ohne Erklärung erkennbar sein.** Die Insel unter der BILDMITTE ist die einzige Antwort, die der Spieler nicht lernen muss. Über Wasser den letzten gültigen Wert stehen lassen, sonst flackert die Leiste.

**Eine Umschlagreichweite muss großzügiger sein als die Anlegestelle selbst** (`SHIP_DOCK_RANGE = 5`): sonst kann der Spieler sein frisch gebautes Schiff am eigenen Hafen nicht beladen – genau das ist im ersten Bildtest passiert.

**Mengenbegrenzung gehört in die Umschlagfunktion, nicht in die Oberfläche.** `shipLoad`/`shipUnload` klemmen selbst auf Bestand und freien Laderaum und liefern die tatsächlich bewegte Menge zurück.

**Ein Umschlag-Panel darf nur Zeilen zeigen, die etwas bedeuten**, und muss `panel.scrollTop` über den Neuaufbau retten.

## Technischer Hinweis: Klimagebundene Gebäude (v25)
**Eine zonengebundene Bauregel gehört als Daten an die Gebäudedefinition** (`def.climates`), mit genau einer generischen Prüfung in `canBuildHere`. Dasselbe Muster nutzen seit v26 `def.needsCoast` und `def.oncePerIsland`.

**Die Ablehnung muss sagen, WO es ginge, nicht nur dass es hier nicht geht** – umgangssprachlich („auf den Eisinseln im Norden"), nicht mit internen Bezeichnern.

**Neue Feldfrucht = Feldfarbe + Reife-Zeichnung + `CROP_KINDS`**, und die Wachstumsstufen über `maxGrowthStage(kind)`.

**Zwei Waren derselben Kategorie brauchen unterscheidbare Silhouetten** – wie Akazie gegen Fichte in v24.

## Technischer Hinweis: Archipel-Generator & Klimazonen (v24)
**Inseln in Größenklassen von groß nach klein setzen** – sonst bleibt für große Inseln kein Platz mehr.

**Küstenlinien aus Sinuswellen über dem Winkel** (`stampIsland`) – unregelmäßige Inseln ohne echtes Rauschverfahren.

**Eine Karte mit garantierten Startbedingungen braucht ausdrückliche Zusicherungen, keine Wahrscheinlichkeiten.**

**Der Mittelpunkt einer unregelmäßigen Insel ist nicht zwangsläufig frei** – `findHomeSpot` sucht spiralförmig nach außen.

**Farbverläufe je Zeile vorberechnen, nicht je Kachel** (`buildClimateColors`); in `applySave` NACH dem Setzen von `CFG.mapSize`.

**Zonen brauchen einen Wobble an der Grenze und Übergänge in der Farbe**, und müssen sich in der FORM unterscheiden, nicht nur in der Farbe. Baumarme Zonen brauchen Bodendetails.

## Technischer Hinweis: Warenverteilung – zwei Richtungen, drei Kriterien (v23.1, erweitert v33.1)
**Abgehende Ware: kürzester Weg gewinnt** (`chooseDeliveryTarget`); ALLE sinnvollen Zielarten müssen in den Vergleich.

**Eingehende Ware: Dringlichkeit, dann Weglänge, dann reihum** (`pickWarehouseDelivery`). **Der Rotationszeiger ist nicht optional** - er entscheidet jetzt nur noch unter gleich dringenden UND gleich nahen Kandidaten.

**Die Weglänge fehlte bis v33.1 in dieser Richtung völlig** - ein Lagerhaus schickte seine Ware genauso oft ans andere Inselende wie zum Betrieb nebenan. Das ist die Art Lücke, die bei drei Gebäuden unsichtbar ist und in einer gewachsenen Stadt jeden Träger die Hälfte seiner Zeit kostet (gemessen: 8,4 statt 4,7 Kacheln je Lieferung, 75 % weniger Durchsatz). **Wer eine Regel für eine Richtung aufstellt, sollte ausdrücklich prüfen, ob sie in der Gegenrichtung auch gilt** - "kürzester Weg gewinnt" stand seit v21 im Dokument und galt trotzdem nur für die Hälfte des Warenflusses.

**Warum die Entfernung hier keinen Verhungerungs-Bug erzeugt (WICHTIG):** weil sie ERST NACH der Dringlichkeit greift. Ein belieferter Betrieb füllt sein Eingangslager und fällt damit aus der Gruppe der Dringendsten heraus; der ferne Betrieb mit leerem Lager ist dann der dringendste und kommt an die Reihe. Ein zweites Kriterium ist nur dann gefahrlos, wenn das erste den Zustand des Bevorzugten VERÄNDERT - sonst gewinnt derselbe Kandidat für immer (genau der Bug aus v23.1).

**Eine Nachschub-Bedingung darf nicht „nur wenn das Ziel LEER ist" lauten**, wenn das Ziel eine Kapazität > 1 hat. Immer gegen `destCapacity` prüfen.

## Technischer Hinweis: Figurengröße und Werkzeug-Handpunkt (v23/v23.1)
Alle Comicfiguren skalieren über `MONSTER_BASE_SCALE` (0.394, zusätzlich mit `camera.zoom`). **Der Handpunkt liegt bei (14, 4) bzw. (13, 3), nicht bei (12, −1)** – wer die Figurengröße ändert, muss den Handpunkt mitprüfen. **Werkstatt-Werkzeuge schwingen nach VORNE, Feldwerkzeuge holen aus.** **dx/dy müssen innerhalb der EIGENEN Kachelraute bleiben** (näherungsweise `|dx|/2 + dy <= 15`); nach OBEN dürfen Requisiten hinausragen, nach UNTEN nicht. **Ein zartes, dünn gestricheltes Werkzeug ist neben der Figur praktisch unsichtbar.**

## Technischer Hinweis: Gebäude-Requisiten müssen die Silhouette verlassen (NEU, v26)
Der Ladekran des Kontors reichte im ersten Entwurf nur bis zur Hauswand – aus der normalen Zoomstufe las er sich wie ein schiefer Kamin. Erst als der Ausleger deutlich über die Wand hinaus übers Wasser ragte und die Kiste frei daneben hing, war auf einen Blick erkennbar, worum es geht. **Ein Erkennungsmerkmal, das innerhalb der Gebäudesilhouette bleibt, ist kein Erkennungsmerkmal** – dieselbe Lehre wie beim Amboss vor der Schmiede (v23) und bei der Akazie gegen die Fichte (v24).

**Zwei Erkennungsmerkmale desselben Gebäudes dürfen sich nicht gegenseitig überlagern (v27).** Die Kürschnerei hat ein Trockengestell mit hängendem Balg UND einen arbeitenden Kürschner. Beide standen zunächst links, die Figur verdeckte das Gestell vollständig. Wer einem Gebäude eine Requisite hinzufügt, muss den Standplatz seines Arbeiters (`PROCESSOR_WORK[type].dx/flip`) mitprüfen - und umgekehrt.

**Eine Requisite muss innerhalb der eigenen Kachelraute BLEIBEN - nach unten (v29 dreifach bestätigt).** Der Walkieferbogen der Walfängerhütte brauchte drei Anläufe: erst stand sein rechter Schenkel in der Hauswand (unlesbar), dann lagen seine Füße bei dy = +8 und wurden von der nächsten Kacheldiagonale überzeichnet, dann war er schmal-hoch und las sich wie ein Zelt. Die Faustformel `|dx|/2 + dy <= 15` ist keine Empfehlung, sondern die Grenze, ab der eine später gezeichnete Kachel darüberläuft. **Wer weit nach außen will, muss nach OBEN ausweichen** - und kann fehlenden Bodenkontakt mit einer kleinen Schneewehe/Schatten an den Füßen andeuten.

**Eine flächige Form allein ist noch kein Gegenstand (v27).** Der hängende Balg war zuerst eine runde braune Fläche und las sich als Fass. Erst eine Silhouette mit Läufen und Schwanz machte daraus ein Fell. Dasselbe Prinzip wie bei Akazie gegen Fichte: die FORM trägt die Erkennung, nicht die Farbe.

## Technischer Hinweis: Sichtbarkeitsgekoppelte Umgebungsgeräusche (v23)
**Ein Geräusch erklingt nur, wenn die Quelle im Fenster zu sehen ist** (`isOnScreen`). **Zwei Bauformen:** *Einzelereignis* mit eigenem Countdown – beim Verschwinden der Quelle den Countdown nur nach unten begrenzen, nicht auf 0 setzen. *Dauerkulisse* (Brandung) mit stufenlosem Pegel und träger Rampe. **Performance:** Sichtbarkeitsprüfung nur alle 200 ms. **Bild und Ton aus EINER Quelle** (`gullPositions()`). **Nicht jedes Geräusch gehört an die Produktion gekoppelt.**

## Technischer Hinweis: Prozedurale Naturmusik & Tageszeit-Stimmung (v23)
Vier dauerhaft übereinanderliegende Schichten: **Bordun**, **Wind** (LFO-Geschwindigkeiten ungleich und unrund), **Pad**, **Melodie**. **Nachts zurücknehmen, nicht umschalten** (`setNightFactor(0..1)`). **Bei jedem Parameter, der jeden Frame gesetzt wird, eine Änderungsschwelle einbauen**, sonst hörbares Zappeln.

## Technischer Hinweis: Ressourcenleiste – gruppiert, einzeilig, waagerecht scrollbar (v22/v25)
IMMER einzeilig (`flex-wrap: nowrap`), bei Platzmangel waagerecht scrollen. **Für ein Flex-KIND reicht `overflow-x:auto` allein nicht:** ohne `min-width: 0` verweigert Flexbox das Schrumpfen. **Umgekehrt (v25):** ein Element, das NICHT schrumpfen darf – der Inselname – braucht `flex: 0 0 auto` plus ein eigenes `max-width`, sonst quetscht dieselbe Flexbox es zur Ellipse („Heimati…").

## Technischer Hinweis: Straßenanschluss-Pflicht & automatischer Verfall (v21/v22/v26.1)
Ein zeitverzögerter Verfall statt eines harten Bauverbots ist das Muster für „braucht dauerhaft Voraussetzung X".

**Wer eine solche Pflicht einführt, muss die Gebäude mitdenken, deren Zweck es ist, allein anzufangen (v26.1).** Das Kontor wird auf einer unbesiedelten Insel gegründet und hat dort naturgemäß keine Straße – die Gnadenfrist machte aus einer Belohnung eine Falle. **Und eine Ausnahme sollte dauerhaft gelten, nicht an eine Bedingung geknüpft sein, die der Spieler versehentlich aufhebt:** „nur solange es allein auf der Insel steht" hätte bedeutet, dass die zweite Hütte daneben drei Minuten später das Kontor kostet. **Die Ausnahmeliste gehört in EINE Funktion** (`needsRoadAccess(b)`), die sowohl die Verfallsschleife als auch das Infopanel befragen – sonst driften Anzeige und Wirkung auseinander.

**Eine gelockerte Regel braucht einen ehrlichen Ersatztext.** Beim Kontor lautet die Zeile nicht mehr „verfällt in 2:47", sondern „nein – nur Seebetrieb" plus die Erklärung, was ohne Straße nicht geht (kein Träger, keine Anbindung an die Inselproduktion). Diese Einschränkung ergibt sich von selbst aus `findPath` und brauchte keine eigene Regel – aber sie muss dastehen, sonst wirkt die Zeile wie ein reiner Mangel.

**Randfälle:** Ausnahmen für das letzte Lagerhaus und das Kontor; ein von mehreren Systemen gesetzter Status-Badge darf beim Zurücksetzen nicht blind auf `null` geschrieben werden; Gebäudetypen ohne eigene periodische Status-Logik setzen `b.blocked` nie selbst zurück; gemeinsamer Entfernungs-Code (`removeBuilding`); der Timer wird nicht gespeichert.

## Technischer Hinweis: iOS-Viewport-Höhe (100vh vs. 100dvh) & Safe-Area-Insets (v20.1)
Mobile Safari definiert `100vh` als die GRÖSSTE mögliche Viewport-Höhe. **Muster:** `height: 100vh; height: 100dvh;`, dieselbe Kette für jedes `max-height`, `bottom: calc(Npx + env(safe-area-inset-bottom))`. **Voraussetzung:** `viewport-fit=cover`. **Testeinschränkung:** Nur WebKit/Safari zeigt das Verhalten.

## Technischer Hinweis: Direkte-Linie-Bewegung ohne Pfadfindung
Nur das ZIEL gegen die Terrain-Regel zu prüfen reicht NICHT – die STRECKE kann durch verbotenes Terrain führen. Abtastung alle ~0,25 Kacheln: `pathCrossesWater` (Rehe) und `pathAllWater` (Schiffe). **Auf der Archipel-Karte leistet `pathCrossesWater` zusätzlich, dass Rehe ihre Insel nie verlassen.** Seit v26 ist `pathAllWater` zusätzlich der Sichtlinientest der Seeweg-Glättung – Schiffe fahren also weiterhin gerade Teilstücke, nur eben mehrere hintereinander.

## Technischer Hinweis: Rechtsklick als eigenständige Eingabe
`mousedown`/`mouseup` feuern für JEDE Maustaste. **Muster:** `onPointerDown`/`onPointerUp` prüfen `if (e.button === 2) return;` und überlassen Taste 2 einem eigenen `contextmenu`-Listener.

## Technischer Hinweis: EIN geteiltes Objekt statt mehrerer synchronisierter Objekte
Wenn mehrere Instanzen konzeptionell EINEN Zustand repräsentieren, sollen sie auf dieselbe Objekt-REFERENZ zeigen (`b.storage = islands[id].storage`). **Beim Serialisieren:** ein Feld je Vorrat (`islandStorages`) plus Rekonstruktion beim Laden – ein Test sollte ausdrücklich die Objektidentität prüfen, denn eine versehentliche Kopie fällt sonst erst als Geisterbestand auf. Seit v26 gilt das für Lagerhäuser UND Kontore, also für alles, was `isStorageNode` bejaht.

## Technischer Hinweis: Globale, aber ungespeicherte Zustands-Objekte – am Beispiel der Rehe
Ein globales Array statt eines Felds auf `b`; Objekte mit `held`-Sperre; **bewusst NICHT gespeichert**; **Reservierung sofort beim Auffinden**; **beim Abreißen die `held`-Sperre lösen**; **Terrain-Einschränkung über die ganze Strecke prüfen**.

## Technischer Hinweis: Scrollbare Panels (WICHTIG, war Quelle eines Bugs)
`display:flex; flex-direction:column` + `max-height` + `overflow-y:auto` reicht allein nicht. Ohne `flex-shrink: 0` auf ALLEN direkten Kindern quetscht Flexbox sie zusammen, bevor der Container überläuft. Beim WAAGERECHTEN Scrollen ist das Äquivalent `min-width: 0`.

## Technischer Hinweis: Faire Bedürfnis-Verteilung bei gemeinsam genutzten Vorräten (WICHTIG, war Quelle eines Bugs)
Brot, Bier, Kleidung und Luxus werden NICHT inline verbraucht. `updatePopulation` sammelt fällige Häuser; erst nach der Schleife werden die Listen sortiert und verbraucht. Grund: kurz hintereinander gebaute Häuser bleiben nahezu phasengleich – eine feste Reihenfolge erzeugt strukturell immer denselben Verlierer. Brot und Bier sortieren nach Streak, Kleidung und Luxus nach Bewohnerzahl. **Seit v25 verbraucht jedes Haus vom Vorrat SEINER Insel** – die Sammel-Listen bleiben global, die Buchung ist inselgenau. **Reihenfolge im Tick:** `updateHouseGrowthAndStatus` nach allen `resolve*Needs()`, `decayDisconnectedBuildings` danach, `updateAmbientSounds`/`setNightFactor` ganz am Ende. `updateRoutes` läuft direkt nach `updateShips`, also vor allem Gebäudebezogenen.

## Technischer Hinweis: Zeigereingabe (WICHTIG, war Quelle eines wiederkehrenden Bugs)
`mousedown`/`touchstart` hängen am **Canvas**, `mousemove`/`mouseup`/`touchend` bewusst am **`window`**. **`pointerActive`** wird nur in `onPointerDown` gesetzt; beide Pinch-Zweige löschen es; ob der Zeiger „über der Karte" ist, beantwortet **`document.elementFromPoint(x, y) === canvas`**, NICHT `getBoundingClientRect()`.

## Einwohner-Figur: Vektor-Comicfigur
`drawMonster()` zeichnet eine Vektor-Comicfigur im Flächen+Outline-Stil. Verwendet für Waren-Träger, alle Feldarbeiter und die ortsfesten Verarbeiter-Arbeiter – seit v23.1 alle in derselben Größe.

## Zoom-Implementierung (technischer Hinweis)
`camera.zoom` (Default 1, Grenzen 0.2/2.5) fließt über `currentTileSize()` in `gridToScreen`/`screenToGrid`/`tileDiamond` ein. Wichtig für Testskripte: `camera.panX`/`panY` sind additive Deltas, nicht absolute Zielkoordinaten. Die Zoomlogik steckt in `applyZoomAt(pos, newZoomRaw)`.

## Technischer Hinweis: Kachelkoordinaten sind nicht immer ganzzahlig
Wegpunkte eines Feldarbeiters (und die eines Schiffs) können BEWUSST Nachkommastellen haben. Jede Funktion, die daraus das Kartenarray indiziert, muss runden und `inBounds` prüfen – betroffen und abgesichert: `tileSpeedFactor`, `finishWork` und `setShipCourse`/`kontorSpotForShip`.

## Technischer Hinweis: Speicherformat
`serializeGame()`/`applySave()` bilden ein Paar; `SAVE_VERSION = 2` wird beim Laden geprüft. Die Karte wird zeilenweise als Zeichenketten kodiert, Wachstums- UND (seit v30) Vorkommensdaten als Sparse-Listen (`deposits: [[x, y, stein, eisen, gold]]`, rund 75 KB gesamt). **Erz stand bis v29.3 als EINZELNE ZIFFER je Kachel in einer Zeichenkettenreihe - eine Kodierung, die bei Vorräten über 9 nicht mehr trägt.** Ein alter Stand mit Ziffernreihen lädt weiterhin: die Ziffer wird mit 25 hochgerechnet, und jede Gebirgskachel bekommt nachträglich einen Steinvorrat, weil sonst ein geladenes Gebirge beim ersten Hieb verschwände. Gebäude werden als Feld-Whitelist gespeichert. **Top-Level-Felder: `islandStorages` (ein Vorrat je Insel, in Insel-ID-Reihenfolge, seit v29.1 OHNE `coin`), `treasury` (die kartenweite Münzkasse, v29.1), `popPeak` (Freischaltungen, v31), `islandTaxRates` und `islandNames` (v33, ebenfalls in ID-Reihenfolge), `ships` (inkl. `cargo`, `routeId`, `routeStop`, seit v34 `shipType`) und `routes` (seit v32 als Stationslisten).** **Wer ein neues Kachel- oder Gebäudefeld einführt, muss es hier ergänzen.** Bewusst nicht gespeichert: Träger, Rehe, `noRoadTimer`, `working`/`workAnim`, `deliveryCursor`, Schiffs-Wegpunkte – sowie Klima und Inselzuordnung.

**Ein Vorrat je Insel setzt voraus, dass die Inseln beim Laden in derselben Reihenfolge entstehen wie beim Speichern.** Gegeben, weil `computeIslands()` zeilenweise von oben links füllt. **Reihenfolge in `applySave` ist kritisch:** erst `CFG.mapSize`, dann Karte, dann `computeIslands()`, dann `buildClimateColors()`, dann die Vorräte, dann die Gebäude (die ihre `storage`-Referenz bekommen), dann die Schiffe – und **zuletzt die Routen**, weil sich erst dann prüfen lässt, ob an beiden Enden noch ein Kontor steht. Eine Route ohne gültige Endpunkte wird stillschweigend verworfen, statt später bei jedem Tick ins Leere zu zeigen; `nextRouteId` wird aus dem Maximum der geladenen IDs neu gesetzt, sonst kollidierten neue Routen mit alten.

**Additive Felder bei GLEICHBLEIBENDER `SAVE_VERSION` brauchen ausdrückliche Defaults (Lehre aus v23):** ohne sie lädt ein älterer Stand `undefined`, und `b.x += dt` ergibt `NaN`. Ein v25-Stand ohne `routes` und ohne `routeId` lädt entsprechend als Spiel ohne Frachtrouten.

## Testtechnischer Hinweis
Wenn ein Testskript die Spielschleife per `window.requestAnimationFrame = () => {}` deaktiviert, feuert der bereits eingeplante letzte Frame noch – danach 150–200 ms warten. **Für Layout-/Scroll-Bugs** über mehrere Viewportgrößen testen. **Für interaktive Infopanel-Aktionen und Baumenü-Knöpfe:** ein ECHTER Locator- oder `btn.click()`-Aufruf ist Pflicht; bei Auswahllisten `selectOption`. **Für provisorisch gebaute Straßennetze:** `findPath` läuft NUR über 4er-Nachbarschaft. **Für zeitgesteuerte Verfallsmechanismen:** die `update*(dt)`-Funktion direkt mit großem `dt` aufrufen.

**Ein frisches Spiel hat noch kein Kontor (NEU, v34).** Ein Testaufbau, der `buildings.find(b => b.type === 'kontor')` erwartet, findet auf der Heimatinsel eines neuen Spielstands nichts - das Kontor ist ein Spielerbau, kein Startgebäude. Ein Test, der eines braucht, muss es sich selbst über `canBuildHere`/`tryPlaceBuilding` bauen (mit `homeIslandId` als Insel), statt es vorauszusetzen.

**Für Audio und Sichtbarkeit (v23):** die `AudioEngine`-Funktion temporär durch einen Zähler ersetzen, einmal zentrieren, einmal wegscrollen, „>0 gegen genau 0" erwarten.

**Einen Erzeuger IMMER bis ins Insellager prüfen, nie nur bis in seinen Ausgabepuffer (NEU, v29.2).** Der v29-Test stellte fest, dass eine Südmine `storage.gold > 0` hat – und genau dort blieb das Gold auch für immer liegen, weil die Träger nur Eisen abholten. Erst der Aufbau mit Straße und Lagerhaus plus die volle Schleife (`updateProduction` + `runLogistics` + `updateCarriers`) beweist, dass die Ware für den Spieler überhaupt existiert. **Die Grenze zwischen zwei Systemen ist genau die Stelle, an der ein Test aufhören will und nicht darf.**

**Bei einer Automatik gehört auch der sichtbare ABLAUF in den Test, nicht nur das Ergebnis (NEU, v29.2).** Die Frachtrouten-Tests prüften seit v26 Bestände und Statustexte – dass das Schiff dabei bis zu fünf Kacheln vor dem Kontor auf offener See stand, fiel keinem Test auf, weil niemand die POSITION beim Umschlag maß. Wo etwas passiert, ist bei einer sichtbaren Simulation Teil des Ergebnisses.

**Eine Prüfung muss auf derselben Ebene fragen, auf der die Regel entscheidet (NEU, v29.3).** Der Test „Gold liegt nur im Süden" fragte das Klima der KACHEL ab; vergeben werden die Adern aber pro INSEL (`islands[i].climate`). Eine große Südinsel, deren Nordrand in den gemäßigten Gürtel ragt, ließ den Test dadurch zufallsabhängig fehlschlagen, obwohl das Spiel genau das Gewünschte tat. Ein Test, der manchmal rot wird, ist schlimmer als keiner - man gewöhnt sich an, ihn zu ignorieren.

**Für flächige Effekte den ANTEIL messen, nicht das Vorhandensein (NEU, v29.3).** „Der Sturm bremst hier" beweist nicht, dass er örtlich begrenzt ist. Erst die Zahl - wie viel Prozent der grundsätzlich möglichen Fläche liegen tatsächlich im Wetter, gemittelt über mehrere Zufallszellen - macht den Unterschied zwischen 100 % (v29) und 2-6 % (v29.3) überhaupt prüfbar. Dazu gehört die Gegenprobe an einer Stelle, die dieselbe Zonenbedingung erfüllt, aber außerhalb der Zelle liegt.

**Ein Gebäude auf der Straßenlinie unterbricht sie (NEU, v33.1).** Ein Testaufbau, der ein Straßenkreuz legt und die Betriebe DARAUF setzt, kappt die Verbindung zu allem, was dahinter liegt - der ferne Betrieb war im ersten Lauf nicht benachteiligt, sondern schlicht unerreichbar. Gebäude gehören NEBEN die Straße, und der Test prüft die Anbindung ausdrücklich, bevor er über Bevorzugung urteilt.

**Für "wer wird bevorzugt" zählt man LIEFERUNGEN, nicht Bestände (NEU, v33.1).** Der erste Versuch verglich die fertigen Bretter in den beiden Sägewerken - die aber laufend abgeholt werden und deshalb bei beiden auf 0 standen: die Prüfung war gar keine. Erst ein Zähler um `dispatchCarrier` herum misst, was die Regel tatsächlich entscheidet (21 zu 11 Lieferungen).

**Was in den Browser-Speicher schreibt, wird über einen NEULADEN-Test geprüft (NEU, v33).** Autosave lässt sich nicht sinnvoll im selben Seitenzustand testen: der interessante Teil ist genau das, was beim nächsten Öffnen passiert. Der Test schreibt deshalb einen Stand mit einer erkennbaren Marke (eine umbenannte Insel), lädt die Seite neu, prüft die Abfrage, klickt "Fortsetzen" und sucht die Marke wieder. Dazu gehören die drei unbequemen Fälle: kein Stand, beschädigter Stand, "Neu anfangen".

**Vor dem Klick auf "Fortsetzen" gehört die Gegenprobe.** Dass nach dem Fortsetzen der gespeicherte Name dasteht, beweist nur dann etwas, wenn vorher NICHT schon derselbe Name dastand - die frisch erzeugte Karte muss also ausdrücklich als andere nachgewiesen werden.

**Andere Testsuiten müssen den Autosave-Eintrag löschen (NEU, v33).** Sobald das Spiel im Hintergrund speichert, startet jeder spätere Test mit einer Fortsetzen-Abfrage über der Karte - und klickt seine ersten Knöpfe daneben. Jede Suite räumt deshalb zu Beginn auf bzw. klickt "Neu anfangen" weg.

**Element-Handles überleben ein Panel nicht, das sich selbst neu aufbaut (NEU, v32).** Ein mit `page.$()` gemerkter Knopf zeigt nach dem nächsten 400-ms-Takt auf einen längst ersetzten Knoten ("Element is not attached to the DOM"). In solchen Panels wird IMMER frisch über den Selektor geklickt (`page.click('.sel')`), nie über einen zuvor gespeicherten Handle.

**Wer die Spielschleife abschaltet, muss sie auch wieder anwerfen können (NEU, v32).** `window.requestAnimationFrame = () => {}` unterbricht die Kette; `delete window.requestAnimationFrame` holt die Funktion NICHT zurück (sie ist eine eigene Eigenschaft von window) - und selbst mit dem Original läuft nichts weiter, solange niemand den nächsten Frame anfordert. Für einen Echtzeitlauf nach einem Direktaufruf-Block also: Original merken, später zurücksetzen UND `requestAnimationFrame(gameLoop)` aufrufen.

**Ein Echtzeitlauf braucht eine MARKE, sonst prüft er nichts (NEU, v32).** Der Test "läuft der Automat unter der echten Spielschleife weiter?" las den Statustext des Schiffs - der aber noch vom vorherigen Direktaufruf-Block stammte und deshalb auch dann passte, wenn die Schleife gar nicht mehr lief. Erst ein vorher gesetzter Platzhalter ("MARKE"), der verschwunden sein MUSS, macht daraus einen echten Nachweis.

**Eine Verneinung als Testergebnis ist selten ein Beweis (NEU, v31.1).** „Nach dem Stopp ist kein Arbeiter mehr unterwegs" war erfüllt - und verdeckte, dass die Fuhre des heimkehrenden Arbeiters weggeworfen wurde. Erst die POSITIVE Ergänzung („…und sein Holz ist auch tatsächlich im Gebäude angekommen") fand den Fehler. Wo ein Test etwas verschwinden sieht, gehört die Frage dazu, wo es hingegangen ist.

**Eine Hilfsfunktion, die eine Regel des Spiels nachbaut, muss deren Maß kennen (NEU, v31.1).** Der Test legte Wald „im Umkreis von drei Kacheln" an - der Einzugsradius ist aber EUKLIDISCH, und eine Kachel bei dx=3/dy=3 liegt 4,2 Felder entfernt und damit außerhalb von radius 4. Der Test schlug dadurch in etwa jedem vierten Lauf fehl. Dasselbe Muster wie beim Klima-Test aus v29.3: auf derselben Ebene und mit demselben Maß prüfen, mit dem die Regel entscheidet - und die Voraussetzung ausdrücklich mitprüfen (hier: findet der Betrieb sein Ziel überhaupt?), statt sie anzunehmen.

**Testaufbau zwischen zwei Blöcken vollständig zurücksetzen, nicht nur teilweise (NEU, v31.1).** Ein zweiter Testblock setzte `trees = 4` auf eine Kachel, die der erste Block leer geerntet hatte - eine leer geerntete Waldkachel wird aber zu GRASLAND, und Bäume auf Gras sind kein Wald. Auch hier: launisch statt falsch, und damit schlimmer als ein klarer Fehlschlag.

**Bei mehreren Bedingungen prüft ein Test IMMER die zuerst greifende (NEU, v31).** `upgradeBlocker` gibt den ersten Hinderungsgrund zurück; ein Test, der die Baustoffe wegnimmt, während auch das Wirtshaus fehlt, prüft in Wahrheit das Wirtshaus. Reihenfolge im Test heißt: alle anderen Bedingungen erfüllen, dann genau eine wegnehmen.

**Eine Prüffunktion kann in derselben Funktion mehr entscheiden, als der Test im Blick hat (NEU, v31).** Der Test "eine Siedlerkate verliert ohne Wirtshaus niemanden" schlug fehl, weil `updatePopulation` in denselben Aufrufen auch die Kapelle prüft - der Bewohner zog wegen fehlenden GLAUBENS aus, nicht wegen des Biers. Wer eine einzelne Regel isolieren will, muss die Nachbarregeln ausdrücklich erfüllen, nicht bloß ignorieren.

**Für ein Bild, das an gezeichnete Objekte anschließt, gehört ein DECKUNGSTEST dazu (NEU, v31).** Die Fernansicht malt das Gelände als ein Bild, die Gebäude aber weiterhin einzeln über `gridToScreen`. Ein halber Kachelversatz in der Matrix wäre im Standbild kaum zu sehen, würde aber jedes Haus neben seine Insel setzen. Der Test färbt einen Fleck Kacheln um, rendert und liest die Farbe an der von `gridToScreen` berechneten Bildschirmstelle zurück - er vergleicht damit die beiden Zeichenwege gegeneinander statt jeden für sich.

**Eine Hilfsfunktion im Test, die "n Plätze" liefert, muss auch n liefern (NEU, v31).** Eine innere Schleife über zwei Richtungen überschritt die Obergrenze um bis zu zwei Einträge; der Fehler tauchte erst Dutzende Zeilen später als "capacity of undefined" auf und war lauflaunisch. Testcode verdient dieselbe Sorgfalt wie Spielcode - ein Test, der manchmal rot wird, wird ignoriert.

**Für endliche Vorräte gehört der VOLLSTÄNDIGE Abbau in den Test, nicht nur die erste Fuhre (NEU, v30).** Interessant sind ausschließlich die Ränder: gibt eine Ader exakt ihren Vorrat her und keine Fuhre mehr, meldet der Erzeuger danach sauber „nichts mehr da", und stimmt der Zustand des Geländes an jedem der Übergänge? Der Test setzt Restvorräte deshalb direkt (`t.iron = 3`), statt fünfzehn Minuten Spielzeit zu simulieren.

**Bei einer Zustandsänderung des Geländes ist die FOLGE der eigentliche Test (NEU, v30).** Dass die Kachel `terrain === 'grass'` trägt, ist die halbe Aussage; die andere Hälfte ist, dass `canBuildHere` dort jetzt ein Haus erlaubt - genau das hat der Nutzer verlangt. Ein Test, der nur das interne Feld prüft, würde eine vergessene Nebenbedingung (Bäume, Wachstumsdaten) nicht bemerken.

**Für Preis- und Wirtschaftsregeln die UNGLEICHUNG prüfen, nicht Beispielwerte (NEU, v30).** „Gold ist im Süden billiger als im Norden" ist ein Stichprobentest; „für KEINE Ware liegt irgendwo ein Verkaufspreis über dem günstigsten Kaufpreis" ist die Regel selbst, über alle Waren und alle Inseln gerechnet. Solche Tests kosten drei Zeilen und sichern gegen jede spätere Preisänderung ab.

**Für Verteilungs-/Fairness-Bugs (v23.1):** Empfänger aufbauen, Vorrat für ALLE bereitstellen, N-mal `runLogistics()` laufen lassen, sofort zustellen, am Ende ZÄHLEN. Ein Nullwert bei einem erreichbaren Empfänger ist der Beweis. **Den Bug in einer Kopie mit der ALTEN Logik gegenprüfen.** **Testblöcke auf derselben Seite müssen `pendingOut` zurücksetzen.**

**Für Kartengeneratoren (v24):** einen Zufallsgenerator prüft man über STATISTIK aus mehreren Durchläufen. **Zusammenhängende Landmassen zählt man per Flood-Fill über dieselbe Nachbarschaft, die auch die Pfadsuche nutzt.** **Startbedingungen ausdrücklich testen, nicht annehmen.** **Für kartenweite Optimierungen gehört ein Negativtest dazu.**

**Für getrennte Vorräte (v25):** Trennung beweist man daran, dass die UNBETEILIGTE zweite Insel sich NICHT mitverändert hat. Objektidentität ausdrücklich prüfen. **Für Umschlag-Mechanik:** die Erhaltungsgröße testen (Insel + Schiff bleibt konstant) und ausdrücklich den Fall FERN vom Hafen, der fehlschlagen MUSS. **Für Regeln, die von der Kartenposition abhängen:** je Zone eine Kachel suchen und ALLE betroffenen Gebäudetypen durchprobieren, inklusive eines nicht betroffenen als Kontrolle.

**Für Bauregeln, die eine andere verschärfen (NEU, v26):** die neue Regel gegen die alte testen, nicht nur gegen sich selbst. Der Nachweis für die Küstenpflicht des Kontors ist eine Kachel, auf der der HAFEN erlaubt und das Kontor abgelehnt wird – „Kontor mitten im Land abgelehnt" allein hätte auch eine viel zu lasche Regel bestanden.

**Für VERSCHÄRFTE Regeln gehört ein Test auf ALTE Spielstände dazu (NEU, v26.2).** `canBuildHere` läuft nur beim Bauen – ein Gebäude, das nach der alten Regel entstanden ist, bleibt stehen und muss weiter funktionieren. Der Test baut deshalb künstlich einen Hafen ins Landesinnere in einen Spielstand hinein, lädt ihn und prüft, dass dieser Hafen noch ein Schiff aufs Wasser setzen und umschlagen kann. Das ist billiger als jede Migration und deckt genau den Fall ab, den ein Spieler tatsächlich erlebt.

**Ein Testskript, das die Spielschleife abschaltet, muss Zustände NACH dem letzten Frame setzen (v27 erneut bestätigt).** Der bereits eingeplante Frame läuft noch und ruft `update()` auf - ein zuvor gesetztes `b.working = true` ist danach wieder false, und der Arbeiter fehlt im Screenshot. Reihenfolge also: rAF abschalten → warten → Zustand setzen → `render()` von Hand aufrufen.

**Für gelockerte Regeln immer die GEGENPROBE mitschreiben (NEU, v26.1).** Dass ein Kontor ohne Straße stehen bleibt, beweist noch nicht, dass die Lockerung eng gefasst ist – erst der zweite Test, in dem ein Wohnhaus ohne Straße nach wie vor den Badge bekommt und verfällt, zeigt, dass nicht versehentlich die ganze Mechanik ausgehebelt wurde. Und die Frist im Test großzügig überschreiten (hier das Zehnfache), nicht knapp: eine Ausnahme, die nur zufällig eine Runde länger hält, sähe sonst gleich aus.

**Für automatische Abläufe über Zeit (NEU, v26):** ein Transportautomat lässt sich schnell mit direkten `update*(dt)`-Aufrufen in einer Schleife prüfen (hier 1200 Schritte à 200 ms für zwei volle Rundfahrten), ABER er braucht zusätzlich einen ECHTZEIT-Lauf mit der laufenden Spielschleife. Nur der zeigt, ob die Zustände auch im Zusammenspiel mit dem realen Frame-Takt und `requestAnimationFrame` weiterlaufen. Beides zusammen kostet wenig und deckt verschiedene Fehler auf.

**Für Rückwärtskompatibilität (NEU, v26):** einen frisch erzeugten Spielstand nehmen, die NEUEN Felder gezielt herauslöschen und ihn erneut laden – das ist ein billiger, exakter Test für „lädt ein Stand der Vorversion noch?", ohne dass man eine alte Datei aufheben müsste.

**Bildtests finden, was Funktionstests nicht finden können (v25 und v26 bestätigt).** In v25 waren es ein Schiff außerhalb der Reichweite seines eigenen Hafens und ein abgeschnittener Inselname; in v26 ein Ladekran, der innerhalb der Hauswand endete und deshalb wie ein schiefer Kamin aussah. Alle drei waren funktional korrekt. **Faustregel: was der Spieler im normalen Spielverlauf als ERSTES tut oder sieht, muss einmal im Bild geprüft werden** – und ein neues Gebäude gehört im Bild NEBEN das ähnlichste bestehende gestellt.

**FPS im Headless-Browser sagt wenig über eine Regression aus.** In dieser Runde fiel der Wert von 60 auf 38 – die Vergleichsmessung mit dem unveränderten v25-Build im selben Container ergab ebenfalls 40. Aussagekräftig ist stattdessen, die fraglichen Funktionen einzeln in einer Schleife zu messen (`updateRoutes` 0 ms, `render()` 9,5 ms als tatsächlicher Flaschenhals).
