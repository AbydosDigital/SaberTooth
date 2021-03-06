import Theme from '.././Theme';
import Container from './Container';
import Image from './Image';
import Alignment from '../layoutSys/Alignment';
import ExpandingPolicy
    from '../layoutSys/sizePolicies/ExpandingPolicy';
import FixedPolicy
    from '../layoutSys/sizePolicies/FixedPolicy';
import {HORIZONTAL, VERTICAL} from '.././const';
import {settings} from '../Settings';

/* Add widget style to ST.Theme.defaults. This way the widget
will always have a style even if the given theme doesn't have one
specifically for it. All widgets that have themable elements
should call this method before describing their class.*/
Theme.registerDefaultWidgetStyle('slider', {
    track: {
        enabled: 0x303030,
        disabled: 0x2e2e2e,
    },
    button: {
        enabled: 0x284328,
        disabled: 0x303030,
        hover: 0x264e26,
        click: 0x3a723a,
    },
});

/* Add configurable settings to the global settings instance. Any
Widget that needs configurable hard defaults for various things, like
an objects default size, should use this so that the user can configure
them without editing source code.*/
settings.add('slider', {
    track: {
        shortSize: 5,
        hitAreaPadding: 5,
    },
    button: {
        width: 20,
        height: 20,
    },
});

/**
 * A button on a track used to manipulate a variable
 * @extends ST.Widgets.Container
 * @memberof ST.Widgets
 *
 * @example
 * let widget = new ST.Widgets.Slider(myApp.root, {
 *  width: 300,
 *  height: 30,
 *  orientation: ST.Horizontal
 * });
 *
 * widget.minValue = 40;
 * widget.maxValue = 200;
 *
 * // Callback that transforms the return value of the slider.
 * // Great for rounding the value for example.
 * widget.valueCB = (val)=>{
 *  return value--;
 * };
 *
 * console.log(slider.value);
 */
export default class Slider extends Container {
    /**
     * @param {ST.Widgets.BaseWidget} parent The widgets parent
     * @param {Object} [options] See {@link ST.Widgets.BaseWidget}
     * @param {Number} [options.orientation] Direction of slider
     */
    constructor(parent, options = {}) {
        super(parent, options);

        const defaults = {
            orientation: HORIZONTAL,
        };

        options = Object.assign(defaults, options);

        this.interactive = false;

        /**
         * Holds orientation internally
         * @member {Number}
         * @private
         */
        this._orientation = options.orientation;

        /**
         * The minimum value of the slider
         * @member {Number}
         */
        this.minValue = 0;

        /**
         * The maximum value of the slider
         * @member {Number}
         */
        this.maxValue = 1;

        /**
         * Holds the current value internally
         * @member {Number}
         */
        this._value = 0;

        /**
         * Set this callback and it will fire
         * whenever the slider value changes.
         * @member {Function}
         */
        this.valueCB = null;

        // Remove padding so that the track
        // extends the full length of the widget
        this.padding.setAllTo(0);

        /**
         * The track that the button slides on
         * @member {ST.Widgets.Image}
         */
        this.track = new Image(this, {texture: this.theme.texture});
        this.track.interactive = true;

        /**
         * Rectangle used to extend the 'clickable' area of the track
         * @member {PIXI.Rectangle}
         * @private
         */
        this.trackHitRect = new PIXI.Rectangle();
        this.track.hitArea = this.trackHitRect;

        /**
         * Padding that extends the 'clickable' area of the track
         * @member {Number}
         * @default 5
         */
        this.trackHitPadding = settings.slider.track.hitAreaPadding;

        /**
         * The button that rides the track
         * @type {ST.Widgets.Image}
         */
        this.button = new Image(this, {
            texture: this.theme.texture,
            width: settings.slider.button.width,
            height: settings.slider.button.height,
        });
        this.button.interactive = true;

        /**
         * Pre-calculated and cached. Used in multiple places
         * @member {Number}
         * @private
         */
        this.btnHalfWidth = this.button.width / 2;

        /**
         * Pre-calculated and cached. Used in multiple places
         * @member {Number}
         * @private
         */
        this.btnHalfHeight = this.button.height / 2;

        /**
         * Used internally to track if the mouse is dragging
         * @member {Boolean}
         * @private
         */
        this._dragging = false;

        // listen to button pointer events, Handle dragging and call this
        // widgets paint methods
        this.button.on('pointerdown', (e)=>{
            this._dragging = true;
            this.paintDown();
        });
        this.button.on('pointerup', (e)=>{
            this._dragging = false;
            this.paintDefault();
        });
        this.button.on('pointerupoutside', (e)=>{
            this._dragging = false;
            this.paintDefault();
        });
        this.button.on('pointercancel', (e)=>{
            this._dragging = false;
            this.paintDefault();
        });

        // Handle sliding the button on the track
        this.button.on('pointermove', (e)=>{
            if(this._dragging) {
                // prevent infinite loop caused by updates
              this.button.bypassInvalidation = true;

              const pos = e.data.getLocalPosition(this);
              const usableWidth = this.track.width - this.btnHalfWidth;
              const usableHeight = this.track.height - this.btnHalfHeight;

              if(this.orientation === ST.HORIZONTAL) {
                  if (pos.x > this.btnHalfWidth
                      && pos.x < usableWidth) {
                    this.button.x = pos.x - this.btnHalfWidth;
                    this.button.applyPosition();
                    this.value; // get and set value internally;
                } else if(pos.x > usableWidth) {
                    this.button.x = usableWidth - this.btnHalfWidth;
                    this.button.applyPosition();
                    this.value; // get and set value internally;
                } else if(pos.x < this.btnHalfWidth) {
                    this.button.x = 0;
                    this.button.applyPosition();
                    this.value; // get and set value internally;
                }
            } else { // vertical
                  if (pos.y > this.btnHalfHeight
                      && pos.y < usableHeight) {
                    this.button.y = pos.y - this.btnHalfHeight;
                    this.button.applyPosition();
                    this.value; // get and set value internally;
                } else if(pos.y > usableHeight) {
                    this.button.y = usableHeight - this.btnHalfHeight;
                    this.button.applyPosition();
                    this.value; // get and set value internally;
                } else if(pos.y < this.btnHalfHeight) {
                    this.button.y = 0;
                    this.button.applyPosition();
                    this.value; // get and set value internally;
                }
              }
              this.button.bypassInvalidation = false;
              this.paintDown();
              this.emit('changed');
            }
        });

        this.track.on('pointertap', (e)=>{
            const pos = e.data.getLocalPosition(this);

            if(this.orientation === ST.HORIZONTAL) {
                // prevent infinite loop caused by updates
                this.button.bypassInvalidation = true;

                if(pos.x > this.track.width - this.button.width) {
                    pos.x -= this.button.width;
                }
                this.button.x = pos.x;
                this.button.applyPosition();
                this.value; // get and set value internally;
                this.button.bypassInvalidation = false;
            } else {
                this.button.bypassInvalidation = true;
                if(pos.y > this.track.height - this.button.height) {
                    pos.y -= this.button.height;
                }
                this.button.y = pos.y;
                this.button.applyPosition();
                this.value; // get and set value internally;
                this.button.bypassInvalidation = false;
            }
            this.emit('changed');
        });

        this.orientation = options.orientation;

        // keep these cached vars updated with changes in button size
        this.button.on('sizeChanged', ()=>{
            this.btnHalfWidth = this.button.width / 2;
            this.btnHalfHeight = this.button.height / 2;
        }, this);

        // make sure value doesn't change when widget resizes
        this.track.on('sizeChanged', ()=>{
            this.value = this._value;
        }, this);

        // update tracks extended hit area when orientation or size changes
        this.track.on('updated', this.updateTrackHitRect, this);

        this.paintDefault();

        /**
         * Fires when the sliders value changes
         * @event ST.widgets.slider#changed
         */
    }

    /**
     *Update the tracks extended clickable area
     *@private
     */
    updateTrackHitRect() {
        let thr = this.trackHitRect;
        if(this.orientation === HORIZONTAL) {
            thr.x = 0;
            thr.y = 0 - this.trackHitPadding;
            thr.width = this.track.width;
            thr.height = this.track.height + (this.trackHitPadding * 2);
        } else {
            thr.x = 0 - this.trackHitPadding;
            thr.y = 0;
            thr.width = this.track.width + (this.trackHitPadding * 2);
            thr.height = this.track.height;
        }
    }

    /** @inheritdoc */
    paintDefault() {
        // no need to check track too. If button exist track should
        if(this.button) {
            this.track.texture
                = this.theme.textures.slider.track.enabled;
            this.button.texture
                = this.theme.textures.slider.button.enabled;
        }
    }

    /** @inheritdoc */
    paintDisabled() {
        if(this.button) {
            this.track.texture
                = this.theme.textures.slider.track.disabled;
            this.button.texture
                = this.theme.textures.slider.button.disabled;
        }
    }

    /** @inheritdoc */
    paintDown() {
        if(this.button) {
            this.button.texture
                = this.theme.textures.slider.button.click;
        }
    }

    /** @inheritdoc */
    paintHover() {
        if(this.button) {
            this.button.texture
                = this.theme.textures.slider.button.hover;
        }
    }

    /**
     * The value of the slider based on the buttons position on the track
     *@member {Number}
     */
    get value() {
        if(this.orientation === HORIZONTAL) {
            const value =
                (((this.maxValue - this.minValue)
                    / (this.track.width - this.button.width))
                    * this.button.x) + this.minValue;

                this._value = value;

            if(this.valueCB) {
                return this.valueCB(value);
            } else {
                return value;
            }
        } else {
            const value =
                (((this.maxValue - this.minValue)
                    / (this.track.height - this.button.height))
                    * this.button.y) + this.minValue;

                this._value = value;

            if(this.valueCB) {
                return this.valueCB(value);
            } else {
                return value;
            }
        }
    }

    set value(val) { // eslint-disable-line require-jsdoc
        // make sure the value is within the set range
        val = Math.min(Math.max(val, this.minValue), this.maxValue);
        this.oldValue = this._value = val;

        this.button.beginBypassUpdate();

        if(this.orientation === HORIZONTAL) {
            const pos
            = ((val - this.minValue) / (this.maxValue - this.minValue))
            * (this.track.width - this.button.width);

            this.button.x = pos;
            this.button.applyPosition();
        } else {
            const pos
            = ((val - this.minValue) / (this.maxValue - this.minValue))
            * (this.track.height - this.button.height);

            this.button.y = pos;
            this.button.applyPosition();
        }
        this.button.endBypassUpdate();
        this.emit('changed');
    }

    /**
     * The direction of the slider.(ST.HORIZONTAL or ST.VERTICAL)
     * @member {Number}
     */
    get orientation() {
        return this._orientation;
    }

    set orientation(val) { // eslint-disable-line require-jsdoc
        if(val === HORIZONTAL) {
            this._orientation = val;

            this.min.height = this.button.height;
            this.min.width = this.button.width * 2;
            this.max.height = this.min.height;
            this.max.width = 10000;

            this.track.width = this.width;
            this.track.height = settings.slider.track.shortSize;

            this.layout.alignment.hAlign = Alignment.left;
            this.layout.alignment.vAlign = Alignment.middle;

            this.track.hPolicy
                = new ExpandingPolicy(this.track, HORIZONTAL);
            this.track.vPolicy = new FixedPolicy(this.track);
        } else if(val === VERTICAL) {
            this._orientation = val;

            this.min.height = this.button.height * 2;
            this.min.width = this.button.width;
            this.max.height = 10000;
            this.max.width = this.min.width;

            this.track.width = settings.slider.track.shortSize;
            this.track.height = this.height;

            this.layout.alignment.hAlign = Alignment.center;
            this.layout.alignment.vAlign = Alignment.top;

            this.track.vPolicy
                = new ExpandingPolicy(this.track, VERTICAL);
            this.track.hPolicy = new FixedPolicy(this.track);
        } else {
            throw new Error('Slider.orientation must be either ST.HORIZONTAL'
                + ' or UI.VERTICAL');
        }
    }
}
