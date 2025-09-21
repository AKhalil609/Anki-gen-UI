declare module "anki-apkg-export" {
  // Minimal public surface we actually use.
  // The real lib wraps sql.js under the hood.
  export default class AnkiExport {
    constructor(deckName: string);

    /**
     * Attach media to the package.
     * @param filename e.g. "001-foo.jpg"
     * @param data contents of the media file
     */
    addMedia(filename: string, data: Buffer | Uint8Array | ArrayBuffer): void;

    /**
     * Add a basic note with two fields (Front, Back).
     */
    addCard(front: string, back: string): void;

    /**
     * Finalize and return the .apkg binary (as Uint8Array/Buffer/String depending on runtime).
     */
    save(): Promise<Uint8Array | Buffer | string>;
  }
}