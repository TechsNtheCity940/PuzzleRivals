import Phaser from "phaser";

export default class Tile extends Phaser.GameObjects.Container {
  textureKey: string;
  row: number;
  col: number;
  size: number;
  isSelected: boolean;
  isBusy: boolean;
  sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, row: number, col: number, size: number) {
    super(scene, x, y);

    this.textureKey = textureKey;
    this.row = row;
    this.col = col;
    this.size = size;
    this.isSelected = false;
    this.isBusy = false;

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setDisplaySize(size, size);
    this.add(this.sprite);

    this.setSize(size, size);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains,
    );

    this.bindEvents(scene);
    scene.add.existing(this);
  }

  private bindEvents(scene: Phaser.Scene) {
    this.on("pointerover", () => {
      if (!this.isBusy && !this.isSelected) {
        void this.animateTo({ scaleX: 1.05, scaleY: 1.05 }, 120);
      }
    });

    this.on("pointerout", () => {
      if (!this.isBusy && !this.isSelected) {
        void this.animateTo({ scaleX: 1, scaleY: 1 }, 100);
      }
    });

    this.on("pointerdown", () => {
      if (!this.isBusy) {
        scene.events.emit("tile-clicked", this);
      }
    });
  }

  private animateTo(properties: Record<string, number>, duration: number) {
    return new Promise<void>((resolve) => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        ...properties,
        duration,
        ease: "Quad.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  setSelected(selected: boolean) {
    this.isSelected = selected;
    if (selected) {
      void this.animateTo({ scaleX: 1.1, scaleY: 1.1 }, 120);
      this.playTapRing();
      this.setDepth(20);
      return;
    }

    this.setDepth(0);
    void this.animateTo({ scaleX: 1, scaleY: 1 }, 100);
  }

  private playTapRing() {
    const ring = this.scene.add.image(this.x, this.y, "impact_ring");
    ring.setDepth(5);
    ring.setScale(0.35);
    ring.setAlpha(0.85);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  moveTo(x: number, y: number, duration = 180) {
    this.isBusy = true;
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x,
        y,
        duration,
        ease: "Quad.easeInOut",
        onComplete: () => {
          this.isBusy = false;
          resolve();
        },
      });
    });
  }

  async swapVisualWith(otherTile: Tile, duration = 160) {
    const myX = this.x;
    const myY = this.y;
    const otherX = otherTile.x;
    const otherY = otherTile.y;

    this.isBusy = true;
    otherTile.isBusy = true;

    await Promise.all([
      this.moveTo(otherX, otherY, duration),
      otherTile.moveTo(myX, myY, duration),
    ]);

    this.isBusy = false;
    otherTile.isBusy = false;
  }

  playMatchEffect() {
    this.isBusy = true;
    this.disableInteractive();

    const burst = this.scene.add.image(this.x, this.y, "combo_burst");
    burst.setDepth(6);
    burst.setScale(0.36);
    burst.setAlpha(0.92);

    this.scene.tweens.add({
      targets: burst,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: 280,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy(),
    });

    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: 180,
        ease: "Quad.easeIn",
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  spawnIn(targetY: number, duration = 220) {
    this.alpha = 0;
    this.scale = 0.88;
    this.isBusy = true;

    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        y: targetY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration,
        ease: "Back.easeOut",
        onComplete: () => {
          this.isBusy = false;
          resolve();
        },
      });
    });
  }

  updateGridPosition(row: number, col: number) {
    this.row = row;
    this.col = col;
  }
}

