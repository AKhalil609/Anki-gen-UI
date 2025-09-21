import { useEffect, useMemo, useState } from "react";

/* -------------------- Progress types -------------------- */

type ProgressEvent =
  | { type: "preflight"; message: string }
  | {
      type: "progress";
      queued: number;
      running: number;
      done: number;
      failed: number;
      retries: number;
    }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "pack:start"; total: number; parts: number; batchSize: number }
  | { type: "pack:part"; partIndex: number; parts: number; filename: string }
  | { type: "pack:done"; outputs: string[]; durationMs: number }
  | { type: "done"; code: number };

/* -------------------- Voices -------------------- */

type Voice = { id: string; gender: "Female" | "Male" | "Neutral" };

// Generated from your paste (trimmed descriptions, keeping gender)
const VOICES: Voice[] = [
  { id: "af-ZA-AdriNeural", gender: "Female" },
  { id: "af-ZA-WillemNeural", gender: "Male" },
  { id: "am-ET-AmehaNeural", gender: "Male" },
  { id: "am-ET-MekdesNeural", gender: "Female" },
  { id: "ar-AE-FatimaNeural", gender: "Female" },
  { id: "ar-AE-HamdanNeural", gender: "Male" },
  { id: "ar-BH-AliNeural", gender: "Male" },
  { id: "ar-BH-LailaNeural", gender: "Female" },
  { id: "ar-DZ-AminaNeural", gender: "Female" },
  { id: "ar-DZ-IsmaelNeural", gender: "Male" },
  { id: "ar-EG-SalmaNeural", gender: "Female" },
  { id: "ar-EG-ShakirNeural", gender: "Male" },
  { id: "ar-IQ-BasselNeural", gender: "Male" },
  { id: "ar-IQ-RanaNeural", gender: "Female" },
  { id: "ar-JO-SanaNeural", gender: "Female" },
  { id: "ar-JO-TaimNeural", gender: "Male" },
  { id: "ar-KW-FahedNeural", gender: "Male" },
  { id: "ar-KW-NouraNeural", gender: "Female" },
  { id: "ar-LB-LaylaNeural", gender: "Female" },
  { id: "ar-LB-RamiNeural", gender: "Male" },
  { id: "ar-LY-ImanNeural", gender: "Female" },
  { id: "ar-LY-OmarNeural", gender: "Male" },
  { id: "ar-MA-JamalNeural", gender: "Male" },
  { id: "ar-MA-MounaNeural", gender: "Female" },
  { id: "ar-OM-AbdullahNeural", gender: "Male" },
  { id: "ar-OM-AyshaNeural", gender: "Female" },
  { id: "ar-QA-AmalNeural", gender: "Female" },
  { id: "ar-QA-MoazNeural", gender: "Male" },
  { id: "ar-SA-HamedNeural", gender: "Male" },
  { id: "ar-SA-ZariyahNeural", gender: "Female" },
  { id: "ar-SY-AmanyNeural", gender: "Female" },
  { id: "ar-SY-LaithNeural", gender: "Male" },
  { id: "ar-TN-HediNeural", gender: "Male" },
  { id: "ar-TN-ReemNeural", gender: "Female" },
  { id: "ar-YE-MaryamNeural", gender: "Female" },
  { id: "ar-YE-SalehNeural", gender: "Male" },
  { id: "as-IN-PriyomNeural", gender: "Male" },
  { id: "as-IN-YashicaNeural", gender: "Female" },
  { id: "az-AZ-BabekNeural", gender: "Male" },
  { id: "az-AZ-BanuNeural", gender: "Female" },
  { id: "bg-BG-BorislavNeural", gender: "Male" },
  { id: "bg-BG-KalinaNeural", gender: "Female" },
  { id: "bn-BD-NabanitaNeural", gender: "Female" },
  { id: "bn-BD-PradeepNeural", gender: "Male" },
  { id: "bn-IN-BashkarNeural", gender: "Male" },
  { id: "bn-IN-TanishaaNeural", gender: "Female" },
  { id: "bs-BA-GoranNeural", gender: "Male" },
  { id: "bs-BA-VesnaNeural", gender: "Female" },
  { id: "ca-ES-AlbaNeural", gender: "Female" },
  { id: "ca-ES-EnricNeural", gender: "Male" },
  { id: "ca-ES-JoanaNeural", gender: "Female" },
  { id: "cs-CZ-AntoninNeural", gender: "Male" },
  { id: "cs-CZ-VlastaNeural", gender: "Female" },
  { id: "cy-GB-AledNeural", gender: "Male" },
  { id: "cy-GB-NiaNeural", gender: "Female" },
  { id: "da-DK-ChristelNeural", gender: "Female" },
  { id: "da-DK-JeppeNeural", gender: "Male" },
  { id: "de-AT-IngridNeural", gender: "Female" },
  { id: "de-AT-JonasNeural", gender: "Male" },
  { id: "de-CH-JanNeural", gender: "Male" },
  { id: "de-CH-LeniNeural", gender: "Female" },
  { id: "de-DE-AmalaNeural", gender: "Female" },
  { id: "de-DE-BerndNeural", gender: "Male" },
  { id: "de-DE-ChristophNeural", gender: "Male" },
  { id: "de-DE-ConradNeural", gender: "Male" },
  { id: "de-DE-ElkeNeural", gender: "Female" },
  { id: "de-DE-FlorianMultilingualNeural", gender: "Male" },
  { id: "de-DE-GiselaNeural", gender: "Female" },
  { id: "de-DE-KasperNeural", gender: "Male" },
  { id: "de-DE-KatjaNeural", gender: "Female" },
  { id: "de-DE-KillianNeural", gender: "Male" },
  { id: "de-DE-KlarissaNeural", gender: "Female" },
  { id: "de-DE-KlausNeural", gender: "Male" },
  { id: "de-DE-LouisaNeural", gender: "Female" },
  { id: "de-DE-MajaNeural", gender: "Female" },
  { id: "de-DE-RalfNeural", gender: "Male" },
  { id: "de-DE-SeraphinaMultilingualNeural", gender: "Female" },
  { id: "de-DE-TanjaNeural", gender: "Female" },
  { id: "el-GR-AthinaNeural", gender: "Female" },
  { id: "el-GR-NestorasNeural", gender: "Male" },
  { id: "en-AU-AnnetteNeural", gender: "Female" },
  { id: "en-AU-CarlyNeural", gender: "Female" },
  { id: "en-AU-DarrenNeural", gender: "Male" },
  { id: "en-AU-DuncanNeural", gender: "Male" },
  { id: "en-AU-ElsieNeural", gender: "Female" },
  { id: "en-AU-FreyaNeural", gender: "Female" },
  { id: "en-AU-JoanneNeural", gender: "Female" },
  { id: "en-AU-KenNeural", gender: "Male" },
  { id: "en-AU-KimNeural", gender: "Female" },
  { id: "en-AU-NatashaNeural", gender: "Female" },
  { id: "en-AU-NeilNeural", gender: "Male" },
  { id: "en-AU-TimNeural", gender: "Male" },
  { id: "en-AU-TinaNeural", gender: "Female" },
  { id: "en-AU-WilliamMultilingualNeural", gender: "Male" },
  { id: "en-AU-WilliamNeural", gender: "Male" },
  { id: "en-CA-ClaraNeural", gender: "Female" },
  { id: "en-CA-LiamNeural", gender: "Male" },
  { id: "en-GB-AbbiNeural", gender: "Female" },
  { id: "en-GB-AdaMultilingualNeural", gender: "Female" },
  { id: "en-GB-AlfieNeural", gender: "Male" },
  { id: "en-GB-BellaNeural", gender: "Female" },
  { id: "en-GB-ElliotNeural", gender: "Male" },
  { id: "en-GB-EthanNeural", gender: "Male" },
  { id: "en-GB-HollieNeural", gender: "Female" },
  { id: "en-GB-LibbyNeural", gender: "Female" },
  { id: "en-GB-MaisieNeural", gender: "Female" },
  { id: "en-GB-MiaNeural", gender: "Female" },
  { id: "en-GB-NoahNeural", gender: "Male" },
  { id: "en-GB-OliverNeural", gender: "Male" },
  { id: "en-GB-OliviaNeural", gender: "Female" },
  { id: "en-GB-OllieMultilingualNeural", gender: "Male" },
  { id: "en-GB-RyanNeural", gender: "Male" },
  { id: "en-GB-SoniaNeural", gender: "Female" },
  { id: "en-GB-ThomasNeural", gender: "Male" },
  { id: "en-HK-SamNeural", gender: "Male" },
  { id: "en-HK-YanNeural", gender: "Female" },
  { id: "en-IE-ConnorNeural", gender: "Male" },
  { id: "en-IE-EmilyNeural", gender: "Female" },
  { id: "en-IN-AaravNeural", gender: "Male" },
  { id: "en-IN-AartiIndicNeural", gender: "Female" },
  { id: "en-IN-AartiNeural", gender: "Female" },
  { id: "en-IN-AashiNeural", gender: "Female" },
  { id: "en-IN-AnanyaNeural", gender: "Female" },
  { id: "en-IN-ArjunIndicNeural", gender: "Male" },
  { id: "en-IN-ArjunNeural", gender: "Male" },
  { id: "en-IN-KavyaNeural", gender: "Female" },
  { id: "en-IN-KunalNeural", gender: "Male" },
  { id: "en-IN-NeerjaIndicNeural", gender: "Female" },
  { id: "en-IN-NeerjaNeural", gender: "Female" },
  { id: "en-IN-PrabhatIndicNeural", gender: "Male" },
  { id: "en-IN-PrabhatNeural", gender: "Male" },
  { id: "en-IN-RehaanNeural", gender: "Male" },
  { id: "en-KE-AsiliaNeural", gender: "Female" },
  { id: "en-KE-ChilembaNeural", gender: "Male" },
  { id: "en-NG-AbeoNeural", gender: "Male" },
  { id: "en-NG-EzinneNeural", gender: "Female" },
  { id: "en-NZ-MitchellNeural", gender: "Male" },
  { id: "en-NZ-MollyNeural", gender: "Female" },
  { id: "en-PH-JamesNeural", gender: "Male" },
  { id: "en-PH-RosaNeural", gender: "Female" },
  { id: "en-SG-LunaNeural", gender: "Female" },
  { id: "en-SG-WayneNeural", gender: "Male" },
  { id: "en-TZ-ElimuNeural", gender: "Male" },
  { id: "en-TZ-ImaniNeural", gender: "Female" },
  { id: "en-US-AIGenerate1Neural", gender: "Male" },
  { id: "en-US-AIGenerate2Neural", gender: "Female" },
  { id: "en-US-AdamMultilingualNeural", gender: "Male" },
  { id: "en-US-AlloyTurboMultilingualNeural", gender: "Male" },
  { id: "en-US-AmandaMultilingualNeural", gender: "Female" },
  { id: "en-US-AmberNeural", gender: "Female" },
  { id: "en-US-AnaNeural", gender: "Female" },
  { id: "en-US-AndrewMultilingualNeural", gender: "Male" },
  { id: "en-US-AndrewNeural", gender: "Male" },
  { id: "en-US-AriaNeural", gender: "Female" },
  { id: "en-US-AshTurboMultilingualNeural", gender: "Male" },
  { id: "en-US-AshleyNeural", gender: "Female" },
  { id: "en-US-AvaMultilingualNeural", gender: "Female" },
  { id: "en-US-AvaNeural", gender: "Female" },
  { id: "en-US-BlueNeural", gender: "Neutral" },
  { id: "en-US-BrandonMultilingualNeural", gender: "Male" },
  { id: "en-US-BrandonNeural", gender: "Male" },
  { id: "en-US-BrianMultilingualNeural", gender: "Male" },
  { id: "en-US-BrianNeural", gender: "Male" },
  { id: "en-US-ChristopherMultilingualNeural", gender: "Male" },
  { id: "en-US-ChristopherNeural", gender: "Male" },
  { id: "en-US-CoraMultilingualNeural", gender: "Female" },
  { id: "en-US-CoraNeural", gender: "Female" },
  { id: "en-US-DavisMultilingualNeural", gender: "Male" },
  { id: "en-US-DavisNeural", gender: "Male" },
  { id: "en-US-DerekMultilingualNeural", gender: "Male" },
  { id: "en-US-DustinMultilingualNeural", gender: "Male" },
  { id: "en-US-EchoTurboMultilingualNeural", gender: "Male" },
  { id: "en-US-ElizabethNeural", gender: "Female" },
  { id: "en-US-EmmaMultilingualNeural", gender: "Female" },
  { id: "en-US-EmmaNeural", gender: "Female" },
  { id: "en-US-EricNeural", gender: "Male" },
  { id: "en-US-EvelynMultilingualNeural", gender: "Female" },
  { id: "en-US-FableTurboMultilingualNeural", gender: "Neutral" },
  { id: "en-US-GuyNeural", gender: "Male" },
  { id: "en-US-JacobNeural", gender: "Male" },
  { id: "en-US-JaneNeural", gender: "Female" },
  { id: "en-US-JasonNeural", gender: "Male" },
  { id: "en-US-JennyMultilingualNeural", gender: "Female" },
  { id: "en-US-JennyNeural", gender: "Female" },
  { id: "en-US-KaiNeural", gender: "Male" },
  { id: "en-US-LewisMultilingualNeural", gender: "Male" },
  { id: "en-US-LolaMultilingualNeural", gender: "Female" },
  { id: "en-US-LunaNeural", gender: "Female" },
  { id: "en-US-MichelleNeural", gender: "Female" },
  { id: "en-US-MonicaNeural", gender: "Female" },
  { id: "en-US-NancyMultilingualNeural", gender: "Female" },
  { id: "en-US-NancyNeural", gender: "Female" },
  { id: "en-US-NovaTurboMultilingualNeural", gender: "Female" },
  { id: "en-US-OnyxTurboMultilingualNeural", gender: "Male" },
  { id: "en-US-PhoebeMultilingualNeural", gender: "Female" },
  { id: "en-US-RogerNeural", gender: "Male" },
  { id: "en-US-RyanMultilingualNeural", gender: "Male" },
  { id: "en-US-SamuelMultilingualNeural", gender: "Male" },
  { id: "en-US-SaraNeural", gender: "Female" },
  { id: "en-US-SerenaMultilingualNeural", gender: "Female" },
  { id: "en-US-ShimmerTurboMultilingualNeural", gender: "Female" },
  { id: "en-US-SteffanMultilingualNeural", gender: "Male" },
  { id: "en-US-SteffanNeural", gender: "Male" },
  { id: "en-US-TonyNeural", gender: "Male" },
  { id: "en-ZA-LeahNeural", gender: "Female" },
  { id: "en-ZA-LukeNeural", gender: "Male" },
  { id: "es-AR-ElenaNeural", gender: "Female" },
  { id: "es-AR-TomasNeural", gender: "Male" },
  { id: "es-BO-MarceloNeural", gender: "Male" },
  { id: "es-BO-SofiaNeural", gender: "Female" },
  { id: "es-CL-CatalinaNeural", gender: "Female" },
  { id: "es-CL-LorenzoNeural", gender: "Male" },
  { id: "es-CO-GonzaloNeural", gender: "Male" },
  { id: "es-CO-SalomeNeural", gender: "Female" },
  { id: "es-CR-JuanNeural", gender: "Male" },
  { id: "es-CR-MariaNeural", gender: "Female" },
  { id: "es-CU-BelkysNeural", gender: "Female" },
  { id: "es-CU-ManuelNeural", gender: "Male" },
  { id: "es-DO-EmilioNeural", gender: "Male" },
  { id: "es-DO-RamonaNeural", gender: "Female" },
  { id: "es-EC-AndreaNeural", gender: "Female" },
  { id: "es-EC-LuisNeural", gender: "Male" },
  { id: "es-ES-AbrilNeural", gender: "Female" },
  { id: "es-ES-AlvaroNeural", gender: "Male" },
  { id: "es-ES-ArabellaMultilingualNeural", gender: "Female" },
  { id: "es-ES-ArnauNeural", gender: "Male" },
  { id: "es-ES-DarioNeural", gender: "Male" },
  { id: "es-ES-EliasNeural", gender: "Male" },
  { id: "es-ES-ElviraNeural", gender: "Female" },
  { id: "es-ES-EstrellaNeural", gender: "Female" },
  { id: "es-ES-IreneNeural", gender: "Female" },
  { id: "es-ES-IsidoraMultilingualNeural", gender: "Female" },
  { id: "es-ES-LaiaNeural", gender: "Female" },
  { id: "es-ES-LiaNeural", gender: "Female" },
  { id: "es-ES-NilNeural", gender: "Male" },
  { id: "es-ES-SaulNeural", gender: "Male" },
  { id: "es-ES-TeoNeural", gender: "Male" },
  { id: "es-ES-TrianaNeural", gender: "Female" },
  { id: "es-ES-TristanMultilingualNeural", gender: "Male" },
  { id: "es-ES-VeraNeural", gender: "Female" },
  { id: "es-ES-XimenaMultilingualNeural", gender: "Female" },
  { id: "es-ES-XimenaNeural", gender: "Female" },
  { id: "es-GQ-JavierNeural", gender: "Male" },
  { id: "es-GQ-TeresaNeural", gender: "Female" },
  { id: "es-GT-AndresNeural", gender: "Male" },
  { id: "es-GT-MartaNeural", gender: "Female" },
  { id: "es-HN-CarlosNeural", gender: "Male" },
  { id: "es-HN-KarlaNeural", gender: "Female" },
  { id: "es-MX-BeatrizNeural", gender: "Female" },
  { id: "es-MX-CandelaNeural", gender: "Female" },
  { id: "es-MX-CarlotaNeural", gender: "Female" },
  { id: "es-MX-CecilioNeural", gender: "Male" },
  { id: "es-MX-DaliaMultilingualNeural", gender: "Female" },
  { id: "es-MX-DaliaNeural", gender: "Female" },
  { id: "es-MX-GerardoNeural", gender: "Male" },
  { id: "es-MX-JorgeMultilingualNeural", gender: "Male" },
  { id: "es-MX-JorgeNeural", gender: "Male" },
  { id: "es-MX-LarissaNeural", gender: "Female" },
  { id: "es-MX-LibertoNeural", gender: "Male" },
  { id: "es-MX-LucianoNeural", gender: "Male" },
  { id: "es-MX-MarinaNeural", gender: "Female" },
  { id: "es-MX-NuriaNeural", gender: "Female" },
  { id: "es-MX-PelayoNeural", gender: "Male" },
  { id: "es-MX-RenataNeural", gender: "Female" },
  { id: "es-MX-YagoNeural", gender: "Male" },
  { id: "es-NI-FedericoNeural", gender: "Male" },
  { id: "es-NI-YolandaNeural", gender: "Female" },
  { id: "es-PA-MargaritaNeural", gender: "Female" },
  { id: "es-PA-RobertoNeural", gender: "Male" },
  { id: "es-PE-AlexNeural", gender: "Male" },
  { id: "es-PE-CamilaNeural", gender: "Female" },
  { id: "es-PR-KarinaNeural", gender: "Female" },
  { id: "es-PR-VictorNeural", gender: "Male" },
  { id: "es-PY-MarioNeural", gender: "Male" },
  { id: "es-PY-TaniaNeural", gender: "Female" },
  { id: "es-SV-LorenaNeural", gender: "Female" },
  { id: "es-SV-RodrigoNeural", gender: "Male" },
  { id: "es-US-AlonsoNeural", gender: "Male" },
  { id: "es-US-PalomaNeural", gender: "Female" },
  { id: "es-UY-MateoNeural", gender: "Male" },
  { id: "es-UY-ValentinaNeural", gender: "Female" },
  { id: "es-VE-PaolaNeural", gender: "Female" },
  { id: "es-VE-SebastianNeural", gender: "Male" },
  { id: "et-EE-AnuNeural", gender: "Female" },
  { id: "et-EE-KertNeural", gender: "Male" },
  { id: "eu-ES-AinhoaNeural", gender: "Female" },
  { id: "eu-ES-AnderNeural", gender: "Male" },
  { id: "fa-IR-DilaraNeural", gender: "Female" },
  { id: "fa-IR-FaridNeural", gender: "Male" },
  { id: "fi-FI-HarriNeural", gender: "Male" },
  { id: "fi-FI-NooraNeural", gender: "Female" },
  { id: "fi-FI-SelmaNeural", gender: "Female" },
  { id: "fil-PH-AngeloNeural", gender: "Male" },
  { id: "fil-PH-BlessicaNeural", gender: "Female" },
  { id: "fr-BE-CharlineNeural", gender: "Female" },
  { id: "fr-BE-GerardNeural", gender: "Male" },
  { id: "fr-CA-AntoineNeural", gender: "Male" },
  { id: "fr-CA-JeanNeural", gender: "Male" },
  { id: "fr-CA-SylvieNeural", gender: "Female" },
  { id: "fr-CA-ThierryNeural", gender: "Male" },
  { id: "fr-CH-ArianeNeural", gender: "Female" },
  { id: "fr-CH-FabriceNeural", gender: "Male" },
  { id: "fr-FR-AlainNeural", gender: "Male" },
  { id: "fr-FR-BrigitteNeural", gender: "Female" },
  { id: "fr-FR-CelesteNeural", gender: "Female" },
  { id: "fr-FR-ClaudeNeural", gender: "Male" },
  { id: "fr-FR-CoralieNeural", gender: "Female" },
  { id: "fr-FR-DeniseNeural", gender: "Female" },
  { id: "fr-FR-EloiseNeural", gender: "Female" },
  { id: "fr-FR-HenriNeural", gender: "Male" },
  { id: "fr-FR-JacquelineNeural", gender: "Female" },
  { id: "fr-FR-JeromeNeural", gender: "Male" },
  { id: "fr-FR-JosephineNeural", gender: "Female" },
  { id: "fr-FR-LucienMultilingualNeural", gender: "Male" },
  { id: "fr-FR-MauriceNeural", gender: "Male" },
  { id: "fr-FR-RemyMultilingualNeural", gender: "Male" },
  { id: "fr-FR-VivienneMultilingualNeural", gender: "Female" },
  { id: "fr-FR-YvesNeural", gender: "Male" },
  { id: "fr-FR-YvetteNeural", gender: "Female" },
  { id: "ga-IE-ColmNeural", gender: "Male" },
  { id: "ga-IE-OrlaNeural", gender: "Female" },
  { id: "gl-ES-RoiNeural", gender: "Male" },
  { id: "gl-ES-SabelaNeural", gender: "Female" },
  { id: "gu-IN-DhwaniNeural", gender: "Female" },
  { id: "gu-IN-NiranjanNeural", gender: "Male" },
  { id: "he-IL-AvriNeural", gender: "Male" },
  { id: "he-IL-HilaNeural", gender: "Female" },
  { id: "hi-IN-AaravNeural", gender: "Male" },
  { id: "hi-IN-AartiNeural", gender: "Female" },
  { id: "hi-IN-AnanyaNeural", gender: "Female" },
  { id: "hi-IN-ArjunNeural", gender: "Male" },
  { id: "hi-IN-KavyaNeural", gender: "Female" },
  { id: "hi-IN-KunalNeural", gender: "Male" },
  { id: "hi-IN-MadhurNeural", gender: "Male" },
  { id: "hi-IN-RehaanNeural", gender: "Male" },
  { id: "hi-IN-SwaraNeural", gender: "Female" },
  { id: "hr-HR-GabrijelaNeural", gender: "Female" },
  { id: "hr-HR-SreckoNeural", gender: "Male" },
  { id: "hu-HU-NoemiNeural", gender: "Female" },
  { id: "hu-HU-TamasNeural", gender: "Male" },
  { id: "hy-AM-AnahitNeural", gender: "Female" },
  { id: "hy-AM-HaykNeural", gender: "Male" },
  { id: "id-ID-ArdiNeural", gender: "Male" },
  { id: "id-ID-GadisNeural", gender: "Female" },
  { id: "is-IS-GudrunNeural", gender: "Female" },
  { id: "is-IS-GunnarNeural", gender: "Male" },
  { id: "it-IT-AlessioMultilingualNeural", gender: "Male" },
  { id: "it-IT-BenignoNeural", gender: "Male" },
  { id: "it-IT-CalimeroNeural", gender: "Male" },
  { id: "it-IT-CataldoNeural", gender: "Male" },
  { id: "it-IT-DiegoNeural", gender: "Male" },
  { id: "it-IT-ElsaNeural", gender: "Female" },
  { id: "it-IT-FabiolaNeural", gender: "Female" },
  { id: "it-IT-FiammaNeural", gender: "Female" },
  { id: "it-IT-GianniNeural", gender: "Male" },
  { id: "it-IT-GiuseppeMultilingualNeural", gender: "Male" },
  { id: "it-IT-GiuseppeNeural", gender: "Male" },
  { id: "it-IT-ImeldaNeural", gender: "Female" },
  { id: "it-IT-IrmaNeural", gender: "Female" },
  { id: "it-IT-IsabellaMultilingualNeural", gender: "Female" },
  { id: "it-IT-IsabellaNeural", gender: "Female" },
  { id: "it-IT-LisandroNeural", gender: "Male" },
  { id: "it-IT-MarcelloMultilingualNeural", gender: "Male" },
  { id: "it-IT-PalmiraNeural", gender: "Female" },
  { id: "it-IT-PierinaNeural", gender: "Female" },
  { id: "it-IT-RinaldoNeural", gender: "Male" },
  { id: "iu-Cans-CA-SiqiniqNeural", gender: "Female" },
  { id: "iu-Cans-CA-TaqqiqNeural", gender: "Male" },
  { id: "iu-Latn-CA-SiqiniqNeural", gender: "Female" },
  { id: "iu-Latn-CA-TaqqiqNeural", gender: "Male" },
  { id: "ja-JP-AoiNeural", gender: "Female" },
  { id: "ja-JP-DaichiNeural", gender: "Male" },
  { id: "ja-JP-KeitaNeural", gender: "Male" },
  { id: "ja-JP-MasaruMultilingualNeural", gender: "Male" },
  { id: "ja-JP-MayuNeural", gender: "Female" },
  { id: "ja-JP-NanamiNeural", gender: "Female" },
  { id: "ja-JP-NaokiNeural", gender: "Male" },
  { id: "ja-JP-ShioriNeural", gender: "Female" },
  { id: "jv-ID-DimasNeural", gender: "Male" },
  { id: "jv-ID-SitiNeural", gender: "Female" },
  { id: "ka-GE-EkaNeural", gender: "Female" },
  { id: "ka-GE-GiorgiNeural", gender: "Male" },
  { id: "kk-KZ-AigulNeural", gender: "Female" },
  { id: "kk-KZ-DauletNeural", gender: "Male" },
  { id: "km-KH-PisethNeural", gender: "Male" },
  { id: "km-KH-SreymomNeural", gender: "Female" },
  { id: "kn-IN-GaganNeural", gender: "Male" },
  { id: "kn-IN-SapnaNeural", gender: "Female" },
  { id: "ko-KR-BongJinNeural", gender: "Male" },
  { id: "ko-KR-GookMinNeural", gender: "Male" },
  { id: "ko-KR-HyunsuMultilingualNeural", gender: "Male" },
  { id: "ko-KR-HyunsuNeural", gender: "Male" },
  { id: "ko-KR-InJoonNeural", gender: "Male" },
  { id: "ko-KR-JiMinNeural", gender: "Female" },
  { id: "ko-KR-SeoHyeonNeural", gender: "Female" },
  { id: "ko-KR-SoonBokNeural", gender: "Female" },
  { id: "ko-KR-SunHiNeural", gender: "Female" },
  { id: "ko-KR-YuJinNeural", gender: "Female" },
  { id: "lo-LA-ChanthavongNeural", gender: "Male" },
  { id: "lo-LA-KeomanyNeural", gender: "Female" },
  { id: "lt-LT-LeonasNeural", gender: "Male" },
  { id: "lt-LT-OnaNeural", gender: "Female" },
  { id: "lv-LV-EveritaNeural", gender: "Female" },
  { id: "lv-LV-NilsNeural", gender: "Male" },
  { id: "mk-MK-AleksandarNeural", gender: "Male" },
  { id: "mk-MK-MarijaNeural", gender: "Female" },
  { id: "ml-IN-MidhunNeural", gender: "Male" },
  { id: "ml-IN-SobhanaNeural", gender: "Female" },
  { id: "mn-MN-BataaNeural", gender: "Male" },
  { id: "mn-MN-YesuiNeural", gender: "Female" },
  { id: "mr-IN-AarohiNeural", gender: "Female" },
  { id: "mr-IN-ManoharNeural", gender: "Male" },
  { id: "ms-MY-OsmanNeural", gender: "Male" },
  { id: "ms-MY-YasminNeural", gender: "Female" },
  { id: "mt-MT-GraceNeural", gender: "Female" },
  { id: "mt-MT-JosephNeural", gender: "Male" },
  { id: "my-MM-NilarNeural", gender: "Female" },
  { id: "my-MM-ThihaNeural", gender: "Male" },
  { id: "nb-NO-FinnNeural", gender: "Male" },
  { id: "nb-NO-IselinNeural", gender: "Female" },
  { id: "nb-NO-PernilleNeural", gender: "Female" },
  { id: "ne-NP-HemkalaNeural", gender: "Female" },
  { id: "ne-NP-SagarNeural", gender: "Male" },
  { id: "nl-BE-ArnaudNeural", gender: "Male" },
  { id: "nl-BE-DenaNeural", gender: "Female" },
  { id: "nl-NL-ColetteNeural", gender: "Female" },
  { id: "nl-NL-FennaNeural", gender: "Female" },
  { id: "nl-NL-MaartenNeural", gender: "Male" },
  { id: "or-IN-SubhasiniNeural", gender: "Female" },
  { id: "or-IN-SukantNeural", gender: "Male" },
  { id: "pa-IN-OjasNeural", gender: "Male" },
  { id: "pa-IN-VaaniNeural", gender: "Female" },
  { id: "pl-PL-AgnieszkaNeural", gender: "Female" },
  { id: "pl-PL-MarekNeural", gender: "Male" },
  { id: "pl-PL-ZofiaNeural", gender: "Female" },
  { id: "ps-AF-GulNawazNeural", gender: "Male" },
  { id: "ps-AF-LatifaNeural", gender: "Female" },
  { id: "pt-BR-AntonioNeural", gender: "Male" },
  { id: "pt-BR-BrendaNeural", gender: "Female" },
  { id: "pt-BR-DonatoNeural", gender: "Male" },
  { id: "pt-BR-ElzaNeural", gender: "Female" },
  { id: "pt-BR-FabioNeural", gender: "Male" },
  { id: "pt-BR-FranciscaNeural", gender: "Female" },
  { id: "pt-BR-GiovannaNeural", gender: "Female" },
  { id: "pt-BR-HumbertoNeural", gender: "Male" },
  { id: "pt-BR-JulioNeural", gender: "Male" },
  { id: "pt-BR-LeilaNeural", gender: "Female" },
  { id: "pt-BR-LeticiaNeural", gender: "Female" },
  { id: "pt-BR-MacerioMultilingualNeural", gender: "Male" },
  { id: "pt-BR-ManuelaNeural", gender: "Female" },
  { id: "pt-BR-NicolauNeural", gender: "Male" },
  { id: "pt-BR-ThalitaMultilingualNeural", gender: "Female" },
  { id: "pt-BR-ThalitaNeural", gender: "Female" },
  { id: "pt-BR-ValerioNeural", gender: "Male" },
  { id: "pt-BR-YaraNeural", gender: "Female" },
  { id: "pt-PT-DuarteNeural", gender: "Male" },
  { id: "pt-PT-FernandaNeural", gender: "Female" },
  { id: "pt-PT-RaquelNeural", gender: "Female" },
  { id: "ro-RO-AlinaNeural", gender: "Female" },
  { id: "ro-RO-EmilNeural", gender: "Male" },
  { id: "ru-RU-DariyaNeural", gender: "Female" },
  { id: "ru-RU-DmitryNeural", gender: "Male" },
  { id: "ru-RU-SvetlanaNeural", gender: "Female" },
  { id: "si-LK-SameeraNeural", gender: "Male" },
  { id: "si-LK-ThiliniNeural", gender: "Female" },
  { id: "sk-SK-LukasNeural", gender: "Male" },
  { id: "sk-SK-ViktoriaNeural", gender: "Female" },
  { id: "sl-SI-PetraNeural", gender: "Female" },
  { id: "sl-SI-RokNeural", gender: "Male" },
  { id: "so-SO-MuuseNeural", gender: "Male" },
  { id: "so-SO-UbaxNeural", gender: "Female" },
  { id: "sq-AL-AnilaNeural", gender: "Female" },
  { id: "sq-AL-IlirNeural", gender: "Male" },
  { id: "sr-Latn-RS-NicholasNeural", gender: "Male" },
  { id: "sr-Latn-RS-SophieNeural", gender: "Female" },
  { id: "sr-RS-NicholasNeural", gender: "Male" },
  { id: "sr-RS-SophieNeural", gender: "Female" },
  { id: "su-ID-JajangNeural", gender: "Male" },
  { id: "su-ID-TutiNeural", gender: "Female" },
  { id: "sv-SE-HilleviNeural", gender: "Female" },
  { id: "sv-SE-MattiasNeural", gender: "Male" },
  { id: "sv-SE-SofieNeural", gender: "Female" },
  { id: "sw-KE-RafikiNeural", gender: "Male" },
  { id: "sw-KE-ZuriNeural", gender: "Female" },
  { id: "sw-TZ-DaudiNeural", gender: "Male" },
  { id: "sw-TZ-RehemaNeural", gender: "Female" },
  { id: "ta-IN-PallaviNeural", gender: "Female" },
  { id: "ta-IN-ValluvarNeural", gender: "Male" },
  { id: "ta-LK-KumarNeural", gender: "Male" },
  { id: "ta-LK-SaranyaNeural", gender: "Female" },
  { id: "ta-MY-KaniNeural", gender: "Female" },
  { id: "ta-MY-SuryaNeural", gender: "Male" },
  { id: "ta-SG-AnbuNeural", gender: "Male" },
  { id: "ta-SG-VenbaNeural", gender: "Female" },
  { id: "te-IN-MohanNeural", gender: "Male" },
  { id: "te-IN-ShrutiNeural", gender: "Female" },
  { id: "th-TH-AcharaNeural", gender: "Female" },
  { id: "th-TH-NiwatNeural", gender: "Male" },
  { id: "th-TH-PremwadeeNeural", gender: "Female" },
  { id: "tr-TR-AhmetNeural", gender: "Male" },
  { id: "tr-TR-EmelNeural", gender: "Female" },
  { id: "uk-UA-OstapNeural", gender: "Male" },
  { id: "uk-UA-PolinaNeural", gender: "Female" },
  { id: "ur-IN-GulNeural", gender: "Female" },
  { id: "ur-IN-SalmanNeural", gender: "Male" },
  { id: "ur-PK-AsadNeural", gender: "Male" },
  { id: "ur-PK-UzmaNeural", gender: "Female" },
  { id: "uz-UZ-MadinaNeural", gender: "Female" },
  { id: "uz-UZ-SardorNeural", gender: "Male" },
  { id: "vi-VN-HoaiMyNeural", gender: "Female" },
  { id: "vi-VN-NamMinhNeural", gender: "Male" },
  { id: "wuu-CN-XiaotongNeural", gender: "Female" },
  { id: "wuu-CN-YunzheNeural", gender: "Male" },
  { id: "yue-CN-XiaoMinNeural", gender: "Female" },
  { id: "yue-CN-YunSongNeural", gender: "Male" },
  { id: "zh-CN-XiaochenMultilingualNeural", gender: "Female" },
  { id: "zh-CN-XiaochenNeural", gender: "Female" },
  { id: "zh-CN-XiaohanNeural", gender: "Female" },
  { id: "zh-CN-XiaomengNeural", gender: "Female" },
  { id: "zh-CN-XiaomoNeural", gender: "Female" },
  { id: "zh-CN-XiaoqiuNeural", gender: "Female" },
  { id: "zh-CN-XiaorouNeural", gender: "Female" },
  { id: "zh-CN-XiaoruiNeural", gender: "Female" },
  { id: "zh-CN-XiaoshuangNeural", gender: "Female" },
  { id: "zh-CN-XiaoxiaoDialectsNeural", gender: "Female" },
  { id: "zh-CN-XiaoxiaoMultilingualNeural", gender: "Female" },
  { id: "zh-CN-XiaoxiaoNeural", gender: "Female" },
  { id: "zh-CN-XiaoyanNeural", gender: "Female" },
  { id: "zh-CN-XiaoyiNeural", gender: "Female" },
  { id: "zh-CN-XiaoyouNeural", gender: "Female" },
  { id: "zh-CN-XiaoyuMultilingualNeural", gender: "Female" },
  { id: "zh-CN-XiaozhenNeural", gender: "Female" },
  { id: "zh-CN-YunfanMultilingualNeural", gender: "Male" },
  { id: "zh-CN-YunfengNeural", gender: "Male" },
  { id: "zh-CN-YunhaoNeural", gender: "Male" },
  { id: "zh-CN-YunjianNeural", gender: "Male" },
  { id: "zh-CN-YunjieNeural", gender: "Male" },
  { id: "zh-CN-YunxiNeural", gender: "Male" },
  { id: "zh-CN-YunxiaNeural", gender: "Male" },
  { id: "zh-CN-YunxiaoMultilingualNeural", gender: "Male" },
  { id: "zh-CN-YunyangNeural", gender: "Male" },
  { id: "zh-CN-YunyeNeural", gender: "Male" },
  { id: "zh-CN-YunyiMultilingualNeural", gender: "Male" },
  { id: "zh-CN-YunzeNeural", gender: "Male" },
  { id: "zh-CN-guangxi-YunqiNeural", gender: "Male" },
  { id: "zh-CN-henan-YundengNeural", gender: "Male" },
  { id: "zh-CN-liaoning-XiaobeiNeural", gender: "Female" },
  { id: "zh-CN-liaoning-YunbiaoNeural", gender: "Male" },
  { id: "zh-CN-shaanxi-XiaoniNeural", gender: "Female" },
  { id: "zh-CN-shandong-YunxiangNeural", gender: "Male" },
  { id: "zh-CN-sichuan-YunxiNeural", gender: "Male" },
  { id: "zh-HK-HiuGaaiNeural", gender: "Female" },
  { id: "zh-HK-HiuMaanNeural", gender: "Female" },
  { id: "zh-HK-WanLungNeural", gender: "Male" },
  { id: "zh-TW-HsiaoChenNeural", gender: "Female" },
  { id: "zh-TW-HsiaoYuNeural", gender: "Female" },
  { id: "zh-TW-YunJheNeural", gender: "Male" },
  { id: "zu-ZA-ThandoNeural", gender: "Female" },
  { id: "zu-ZA-ThembaNeural", gender: "Male" },
];

/** Format like "French (Female–DeniseNeural)" from id "fr-FR-DeniseNeural" */
function formatVoiceLabel(v: Voice, locale = navigator.language || "en") {
  const [langCode] = v.id.split("-");
  const langName =
    (Intl as any).DisplayNames
      ? new Intl.DisplayNames([locale], { type: "language" }).of(langCode)
      : langCode;
  const name = v.id.substring(v.id.lastIndexOf("-") + 1);
  return `${capitalize(langName)} (${v.gender}–${name})`;
}
function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* -------------------- Defaults -------------------- */
const defaultOpts = {
  deckName: "My Deck",
  voice: "de-DE-KatjaNeural",
  imagesPerNote: 1,
  concurrency: 2,
  colFront: "Front (English sentence)",
  colBack: "Back (German sentence)",
  sqlMemoryMB: 512,
  useDownsample: true,
  imgMaxWidth: 480,
  imgMaxHeight: 480,
  imgFormat: "webp",
  imgQuality: 80,
  imgStripMeta: true,
  imgNoEnlarge: true,
  batchSize: 1000000,
};

/* -------------------- Electron bridge -------------------- */
declare global {
  interface Window {
    anki: {
      chooseFile(): Promise<string | null>;
      chooseOut(): Promise<string | null>;
      run(opts: any): void;
      onEvent(cb: (e: ProgressEvent) => void): void;
    };
  }
}

/* -------------------- Component -------------------- */
export default function App() {
  const isElectron = !!window.anki;

  const [csv, setCsv] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [opts, setOpts] = useState<any>(defaultOpts);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string>("");
  const [progress, setProgress] = useState<{
    done: number;
    failed: number;
    queued: number;
    running: number;
    retries: number;
  } | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);

  const voicesWithCustom = useMemo(() => {
    const found = VOICES.find((v) => v.id === opts.voice);
    return found ? VOICES : [{ id: opts.voice, gender: "Neutral" as const }, ...VOICES];
  }, [opts.voice]);

  useEffect(() => {
    if (!isElectron || !window.anki?.onEvent) return;
    const handler = (e: ProgressEvent) => {
      if (e.type === "log")
        setLog((l) => l + `\n${e.level.toUpperCase()}: ${e.message}`);
      if (e.type === "progress") setProgress(e);
      if (e.type === "preflight") setLog((l) => l + `\n• ${e.message}`);
      if (e.type === "pack:start")
        setLog((l) => l + `\nPacking ${e.total} notes into ${e.parts} file(s)…`);
      if (e.type === "pack:part") setLog((l) => l + `\n→ ${e.filename}`);
      if (e.type === "pack:done") {
        setOutputs(e.outputs);
        setLog((l) => l + `\nDone in ${(e.durationMs / 1000).toFixed(1)}s`);
        setRunning(false);
      }
    };
    window.anki.onEvent(handler);
  }, [isElectron]);

  const canRun = !!csv && !!out && !running;

  const handleRun = () => {
    if (!csv || !out) return;
    if (!isElectron || !window.anki?.run) {
      alert("This action only works in the desktop app. Please run via Electron.");
      return;
    }
    setRunning(true);
    setLog("");
    setOutputs([]);
    window.anki.run({
      input: csv,
      apkgOut: out,
      deckName: opts.deckName,
      mediaDir: pathLike(out, "media"),
      imagesDir: pathLike(out, "media/images"),
      voice: opts.voice,
      imagesPerNote: Number(opts.imagesPerNote) || 1,
      concurrency: Number(opts.concurrency) || 2,
      colFront: opts.colFront,
      colBack: opts.colBack,
      sqlMemoryMB: Number(opts.sqlMemoryMB) || 512,
      useDownsample: !!opts.useDownsample,
      imgMaxWidth: Number(opts.imgMaxWidth) || 480,
      imgMaxHeight: Number(opts.imgMaxHeight) || 480,
      imgFormat: opts.imgFormat,
      imgQuality: Number(opts.imgQuality) || 80,
      imgStripMeta: !!opts.imgStripMeta,
      imgNoEnlarge: !!opts.imgNoEnlarge,
      batchSize: Number(opts.batchSize) || 1000000,
    });
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Top bar */}
      <div className="navbar bg-base-200 border-b">
        <div className="container-page w-full">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">Anki One</div>
            <div className="opacity-60">CSV → TTS + Images → .apkg</div>
          </div>
          <div className="ml-auto" />
        </div>
      </div>

      <main className="container-page py-6 space-y-6">
        {!isElectron && (
          <div className="alert alert-warning shadow">
            <span>
              <b>Preview mode:</b> You’re viewing the UI in a normal browser. Building decks requires
              the desktop app (Electron). Run <code>pnpm --filter anki-one-desktop dev</code> and use the Electron window.
            </span>
          </div>
        )}

        {/* File pickers */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body gap-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <button
                onClick={async () => isElectron && setCsv(await window.anki!.chooseFile())}
                className="btn btn-primary"
                disabled={!isElectron}
                title={!isElectron ? "Desktop-only" : ""}
              >
                Choose CSV
              </button>
              <div className="flex-1">
                <div className="input input-bordered w-full truncate">
                  {csv || "No file chosen"}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <button
                onClick={async () => isElectron && setOut(await window.anki!.chooseOut())}
                className="btn"
                disabled={!isElectron}
                title={!isElectron ? "Desktop-only" : ""}
              >
                Choose Output (.apkg)
              </button>
              <div className="flex-1">
                <div className="input input-bordered w-full truncate">
                  {out || "No output chosen"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control md:col-span-2">
                  <div className="label"><span className="label-text">Deck Name</span></div>
                  <input
                    className="input input-bordered"
                    value={opts.deckName}
                    onChange={(e) => setOpts({ ...opts, deckName: e.target.value })}
                  />
                </label>

                <label className="form-control">
                  <div className="label"><span className="label-text">Voice</span></div>
                  <select
                    className="select select-bordered"
                    value={opts.voice}
                    onChange={(e) => setOpts({ ...opts, voice: e.target.value })}
                  >
                    {voicesWithCustom.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.id === opts.voice && !VOICES.find((x) => x.id === v.id)
                          ? `Custom (${v.id})`
                          : formatVoiceLabel(v)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control">
                  <div className="label"><span className="label-text">Images / Note</span></div>
                  <input
                    className="input input-bordered"
                    type="number"
                    value={opts.imagesPerNote}
                    onChange={(e) => setOpts({ ...opts, imagesPerNote: e.target.value })}
                  />
                </label>

                <label className="form-control">
                  <div className="label"><span className="label-text">Concurrency</span></div>
                  <input
                    className="input input-bordered"
                    type="number"
                    value={opts.concurrency}
                    onChange={(e) => setOpts({ ...opts, concurrency: e.target.value })}
                  />
                </label>

                <div className="md:col-span-2">
                  <div className="label"><span className="label-text">CSV Columns</span></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="input input-bordered"
                      value={opts.colFront}
                      onChange={(e) => setOpts({ ...opts, colFront: e.target.value })}
                      placeholder="Front column"
                    />
                    <input
                      className="input input-bordered"
                      value={opts.colBack}
                      onChange={(e) => setOpts({ ...opts, colBack: e.target.value })}
                      placeholder="Back column"
                    />
                  </div>
                </div>

                <label className="form-control">
                  <div className="label"><span className="label-text">sql.js Memory (MB)</span></div>
                  <input
                    className="input input-bordered"
                    type="number"
                    value={opts.sqlMemoryMB}
                    onChange={(e) => setOpts({ ...opts, sqlMemoryMB: e.target.value })}
                  />
                </label>

                <label className="form-control">
                  <div className="label"><span className="label-text">Batch Size</span></div>
                  <input
                    className="input input-bordered"
                    type="number"
                    value={opts.batchSize}
                    onChange={(e) => setOpts({ ...opts, batchSize: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200 shadow-sm">
              <input type="checkbox" />
              <div className="collapse-title text-md font-medium">Image settings</div>
              <div className="collapse-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control">
                    <div className="label"><span className="label-text">Format</span></div>
                    <select
                      className="select select-bordered"
                      value={opts.imgFormat}
                      onChange={(e) => setOpts({ ...opts, imgFormat: e.target.value })}
                    >
                      <option>jpeg</option>
                      <option>png</option>
                      <option>webp</option>
                      <option>avif</option>
                    </select>
                  </label>

                  <label className="form-control">
                    <div className="label"><span className="label-text">Quality</span></div>
                    <input
                      className="input input-bordered"
                      type="number"
                      value={opts.imgQuality}
                      onChange={(e) => setOpts({ ...opts, imgQuality: e.target.value })}
                    />
                  </label>

                  <label className="form-control">
                    <div className="label"><span className="label-text">Max Width</span></div>
                    <input
                      className="input input-bordered"
                      type="number"
                      value={opts.imgMaxWidth}
                      onChange={(e) => setOpts({ ...opts, imgMaxWidth: e.target.value })}
                    />
                  </label>

                  <label className="form-control">
                    <div className="label"><span className="label-text">Max Height</span></div>
                    <input
                      className="input input-bordered"
                      type="number"
                      value={opts.imgMaxHeight}
                      onChange={(e) => setOpts({ ...opts, imgMaxHeight: e.target.value })}
                    />
                  </label>

                  <label className="label cursor-pointer md:col-span-2">
                    <span className="label-text">Downsample images</span>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={opts.useDownsample}
                      onChange={(e) => setOpts({ ...opts, useDownsample: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions & log */}
          <div className="space-y-6">
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                  <button
                    className={`btn btn-primary ${!isElectron || !canRun ? "btn-disabled" : ""}`}
                    onClick={handleRun}
                    disabled={!isElectron || !canRun}
                  >
                    {running ? "Running…" : "Build Deck"}
                  </button>

                  {progress && (
                    <div className="text-sm opacity-70">
                      done <b>{progress.done}</b> / failed <b>{progress.failed}</b> / running{" "}
                      <b>{progress.running}</b> / queued <b>{progress.queued}</b>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <div className="label"><span className="label-text">Log</span></div>
                <textarea className="textarea textarea-bordered h-56 w-full" value={log} readOnly />
              </div>
            </div>

            {outputs.length > 0 && (
              <div className="card bg-base-200 shadow-sm">
                <div className="card-body">
                  <div className="font-semibold mb-2">Outputs</div>
                  <ul className="list-disc pl-6 space-y-1">
                    {outputs.map((o) => (
                      <li key={o} className="truncate">{o}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------- helpers -------------------- */
function pathLike(out: string, suffix: string) {
  const base = out.replace(/\\\\/g, "/");
  return base.substring(0, base.lastIndexOf("/")) + "/" + suffix;
}