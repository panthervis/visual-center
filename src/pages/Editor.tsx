import classnames from 'classnames'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
// @ts-ignore
import { triggerBase64Download } from 'react-base64-downloader';
import cursorImg from "../assets/img/cursor.jpeg";
import transparent from './transparent.png';
import { DrawPos, Orientation, ToolMode } from './types';
import { useSelector } from 'react-redux'
import { editorState } from '../Reducers/index';
import { ignoreElements } from 'rxjs/operators';
import $ from 'jquery'

interface Props {
    original: string,
    removed: string,
    idx: number,
    saveFun: (removed: string, idx: number, obj: object) => (void),
    closeFun: () => (void),
    push(url: string): void
}

let waitingOnDownload = 0, waitingOnSave = 0;

export default function Editor(
    {
        saveFun,
        closeFun
    }: Props
): ReactElement {
    // Initialise refs to DOM elements
    const colorRef = React.useRef<HTMLInputElement>(null)
    const photoRef = React.useRef<HTMLInputElement>(null)
    const launchModal = React.useRef<HTMLButtonElement>(null)
    const closeModal = React.useRef<HTMLButtonElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const canvasContainer = React.useRef<HTMLDivElement>(null);
    const [context, setContext] = React.useState<CanvasRenderingContext2D | null>(null);

    const originalImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [originalImageContext, setOriginalImageContext] = React.useState<CanvasRenderingContext2D | null>(null);

    const newImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const zoomedNewImageCanvasRef = React.useRef<HTMLCanvasElement>(null);

    const [drawnPos, setDrawnPos] = useState<DrawPos[]>([]);

    const originalImage = React.useRef<HTMLImageElement>(null);
    const removedImage = React.useRef<HTMLImageElement>(null);
    const transparentImage = React.useRef<HTMLImageElement>(null);
    const blurRef = React.useRef<HTMLButtonElement>(null)
    const cursorRef = React.useRef<HTMLDivElement>(null);

    // Initialise tool states
    const [mode, setMode] = useState<ToolMode>(0);

    // Init brush size and zoom (tracked separately)
    const [brushSize, setBrushSize] = useState(9);
    const [zoom, setZoom] = useState(1);
    const [color, setColor] = useState('')
    const [readSaveImage, setReadSaveImage] = useState<any | null>(null)
    // Store whether the background is transparent - we'll need to remove the grid before downloading
    const [backgroundIsTransparent, setBackgroundIsTransparent] = useState(true);

    // Store whether the input image is horizontal or vertical to configure layout as such.
    const [orientation, setOrientation] = useState(Orientation.Vertical);
    const [photo, setPhoto] = useState(true)
    const [erase, setErase] = useState(false)
    const [images, setImages] = useState({ removedImage: '', orignalImage: '' })
    const editor = useSelector<editorState, editorState['editor']>(state => state.editor)

    // Show warning if user tries to leave page
    useEffect(() => {

        if (editor.editor.idx >= 0 && editor.editor.orignalImage !== '' && editor.editor.orignalImage !== null)
            setImages({ ...images, 'removedImage': editor.editor.removedImage, 'orignalImage': editor.editor.orignalImage })
        else
            window.location.replace('/')

        if (launchModal.current)
            launchModal.current.click()
        window.onbeforeunload = function () {
            return true;
        };
        const closeButton = closeModal.current
        return (() => {
            if (closeButton)
                closeButton.click()
        })
    }, []);
    // Create the cursor (an SVG)
    const cursor = useMemo(() => {
         /* return `<svg xmlns='http://www.w3.org/2000/svg' height='${brushSize * zoom}' width='${brushSize * zoom}'><circle cx='${brushSize * zoom / 2}' cy='${brushSize * zoom / 2}' r='${brushSize * zoom / 2 - 2}' fill='none' stroke='rgba(13, 13, 13, 0.6)' stroke-width='4' /></svg>`;  */
        return` <img src=${cursorImg} alt="Cursor" style="width: ${brushSize * zoom}px;height:${brushSize * zoom}px" class="cursor" />`
    }, [brushSize, zoom]);

    // Update/move the cursor as the mouse is moved
    const updateCursor = useCallback((event) => {
        if (cursorRef.current && canvasContainer.current) {
            const boundingRects = canvasContainer.current.getBoundingClientRect();

            // If the cursor is outside the range of the canvas, hide it.
            if (
                boundingRects.left > event.clientX
                || boundingRects.left + canvasContainer.current.clientWidth < event.clientX
                || boundingRects.top > event.clientY
                || boundingRects.top + canvasContainer.current.clientHeight < event.clientY
            ) {
                cursorRef.current.style.display = 'none';
            } else {
                cursorRef.current.style.display = 'block';
            }

            // Move the cursor, compensating for the size of the cursor image to ensure it is centered.
            cursorRef.current.innerHTML = cursor;
           /*  if (brushSize === 3) {
                if (zoom === 1.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 11}px`;
                } else if (zoom === 2.0) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 10}px`;
                } else if (zoom === 2.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 10}px`;
                } else if (zoom === 3) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 8}px`;
                } else if (zoom === 3.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 8}px`;
                } else if (zoom === 4) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 8}px`;
                } else if (zoom === 4.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 6}px`;
                } else if (zoom === 5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 4}px`;
                }

            } else if (brushSize === 6) {
                if (zoom === 1) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 10}px`;
                } else if (zoom === 1.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 8}px`;
                } else if (zoom === 2.0) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 7}px`;
                } else if (zoom === 2.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 6}px`;
                } else if (zoom === 3.0) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 4}px`;
                } else if (zoom === 3.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 2}px`;
                }else if (zoom === 4.0) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 1}px`;
                }
                else {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
                }
            } else if (brushSize === 9) {
                if (zoom === 1) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 8}px`;
                } else if (zoom === 1.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 8}px`;
                } else if (zoom === 2.0) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 3}px`;
                } else if (zoom === 2.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 2}px`;
                }
                else {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
                }
            }
            else if (brushSize === 12) {
                if (zoom === 1) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 6}px`;
                } else if (zoom === 1.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 4}px`;
                }
                else {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
                }
            }
            else if (brushSize === 15) {
                if (zoom === 1) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 5}px`;
                } else if (zoom === 1.5) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 2}px`;
                }
                else {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
                }
            } else if (brushSize === 18) {
                if (zoom === 1) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 4}px`;
                } else {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
                }
            } else if (brushSize === 21) {
                if (zoom === 1) {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2)) - 2}px`;
                } else {
                    cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
                }
            }
            else {
                cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`;
            }
            cursorRef.current.style.left = `${event.pageX - (brushSize * zoom / 2) - 1}px`; */
           /*  $(".cursor").show().css({
                "left": event.clientX,
                "top": event.clientY
              }); */
              cursorRef.current.style.top = `${event.pageY - (brushSize * (zoom / 2))}px`
              cursorRef.current.style.left = `${event.pageX - (brushSize * zoom / 2) - 1}px`
        }
    }, [cursor, cursorRef, canvasContainer, brushSize]);

    // Init the canvas ref on load
    useEffect(() => {
        if (canvasRef.current) {
            const renderCtx = canvasRef.current.getContext('2d');

            if (renderCtx) {
                setContext(renderCtx);
            }
        }
    }, [context]);

    // Init the (hidden) image container canvas ref on load
    useEffect(() => {
        if (originalImageCanvasRef.current) {
            const renderCtx = originalImageCanvasRef.current.getContext('2d');

            if (renderCtx) {
                setOriginalImageContext(renderCtx);
            }
        }
    }, [originalImageContext]);

    // Init image blur
    const [imgBlur, setBlur] = useState(0);

    // Calculate how big the container should be: if the image is landscape, make the width 400px and the height
    // to match the aspect ratio; if the image is portrait, make the height 400px and match the width.
    const divSizing = useMemo(() => {
        return {
            width: (
                originalImage.current ? orientation === Orientation.Horizontal
                    ? 400 * originalImage.current.width / originalImage.current.height
                    : 400 : 0)
                || 0,
            height: (
                originalImage.current ? orientation === Orientation.Vertical
                    ? 400 * originalImage.current.height / originalImage.current.width
                    : 400 : 0
            ) || 0,
        };
    }, [originalImage, removedImage, orientation, originalImageCanvasRef.current?.width, originalImageCanvasRef.current?.height]);

    // Function to clear the main canvas
    const clearCanvas = useCallback(() => {
        if (context) {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }
    }, [context]);

    // Main redrawing function
    const [patternLoaded, setPatternLoaded] = useState(0);
    const draw = useCallback(
        (force: boolean = false, subtractBackground: boolean = false) => {
            // Check if everything is initialised (for TS's sanity)
            if (context
                && originalImageCanvasRef.current
                && originalImage.current
                && removedImage.current
                && patternLoaded
                && zoomedNewImageCanvasRef.current
            ) {
                // Load in the background image and foreground images as patterns, so we can use them in the
                // brush.
                const pattern = context.createPattern(originalImageCanvasRef.current, 'no-repeat');
                const newPattern = context.createPattern(zoomedNewImageCanvasRef.current, 'no-repeat');

                if (pattern && newPattern) {
                    context.lineJoin = 'round';

                    const newDrawnPos = drawnPos;
                    let changedDrawnPos = false;
                    // If forced, redraw everything (alternative to providing force=true attribute).
                    const forced = drawnPos.some(e => e.force);
                    drawnPos
                        // By default, only draw lines that haven't already been drawn to optimise performance (i.e.
                        // don't redraw every line on every render). But if we're forced to, then allow all lines to be
                        // drawn.
                        .filter(pos => forced || force || !pos.drawn)
                        .forEach((pos) => {
                            if (canvasRef.current) {
                                const newContext = canvasRef.current.getContext('2d');

                                if (newContext) {
                                    newContext.lineWidth = pos.brushSize * zoom;
                                    if (!pos.undone) {
                                        if (pos.mode === ToolMode.Restore) {
                                            newContext.globalCompositeOperation = 'source-over';
                                            newContext.strokeStyle = pattern;
                                        } else {
                                            newContext.strokeStyle = newPattern;

                                            // If we're told to make the background transparent instead of using the
                                            // background image, use 'destination-out' to 'cut a hole' in the canvas
                                            // instead of using the pattern we made before.
                                            if (subtractBackground) {
                                                newContext.strokeStyle = 'rgb(0, 0, 0)';
                                                newContext.globalCompositeOperation = 'destination-out';
                                            }
                                        }

                                        newContext.beginPath();

                                        if (pos.isNewLine) {
                                            // If starting a new line, move from 1px to the left to here, so a dot
                                            // appears as confirmation of drag start
                                            newContext.moveTo(pos.x * zoom - 1, pos.y * zoom);
                                        } else {
                                            // Otherwise, just move to the previous/next point (adapting for zoom)
                                            newContext.moveTo(
                                                drawnPos[pos.index - 1].x * zoom,
                                                drawnPos[pos.index - 1].y * zoom,
                                            );
                                        }

                                        // Move to the current point from the previous point
                                        newContext.lineTo(pos.x * zoom, pos.y * zoom);
                                        newContext.closePath();
                                        newContext.stroke();

                                        newDrawnPos[pos.index].drawn = true;

                                        changedDrawnPos = true;
                                    }
                                }
                            }
                        });

                    // Undo all forcing for the next draw cycle
                    if (changedDrawnPos) {
                        setDrawnPos(newDrawnPos.map(item => ({ ...item, force: false })));
                    }
                }
            }
        },
        [context, zoom, drawnPos, canvasRef, originalImage, originalImageCanvasRef, removedImage, patternLoaded, newImageCanvasRef],
    );

    // Fill the main canvas with the image from the hidden canvas containing the foreground image (the one
    // returned from the API)
    const insertForegroundImage = useCallback(() => {
        if (context && removedImage.current) {
            context.drawImage(
                removedImage.current,
                0,
                0,
                divSizing.width * zoom,
                divSizing.height * zoom,
            );
        }
    }, [context, zoom, removedImage, canvasRef, divSizing]);

    // Redraw everything by clearing the canvas, (optionally) loading the background image back in and force-redrawing
    // all lines 
    const forceRedraw = useCallback((ignoreBackground: boolean = false) => {
        if (context && zoomedNewImageCanvasRef.current) {
            clearCanvas();

            if (!ignoreBackground) {
                context.drawImage(zoomedNewImageCanvasRef.current, 0, 0);
            }

            insertForegroundImage();
            draw(true, backgroundIsTransparent && ignoreBackground);
        }
    }, [context, clearCanvas, draw, zoomedNewImageCanvasRef, insertForegroundImage, backgroundIsTransparent]);

    // Handle loading of the images from the API
    const onImageLoad = useCallback(
        () => {
            // Ensure everything is initialised
            if (
                originalImage.current
                && originalImageCanvasRef.current
                && canvasRef.current
                && originalImage.current.width > 0
                && originalImage.current.height > 0
                && newImageCanvasRef.current
                && zoomedNewImageCanvasRef.current
                && patternLoaded < 3
            ) {
                // Set orientation and initial widths of everything (we don't need to worry about zooming at this stage)
                if (originalImage.current.height > originalImage.current.width) {
                    setOrientation(Orientation.Vertical);
                    canvasRef.current.width = 400;
                    canvasRef.current.height = 400 * originalImage.current.height / originalImage.current.width;
                } else {
                    setOrientation(Orientation.Horizontal);
                    canvasRef.current.height = 400;
                    canvasRef.current.width = 400 * originalImage.current.width / originalImage.current.height;
                }

                // Load in the transparent background texture (this is on page load, so this is the default)
                const newImageCanvasContext = newImageCanvasRef.current.getContext('2d');
                if (newImageCanvasContext && transparentImage.current) {
                    newImageCanvasRef.current.width = canvasRef.current.width;
                    newImageCanvasRef.current.height = canvasRef.current.height;

                    // Repeat the pattern, instead of scaling it to fill the background. This has the effect
                    // of making the background squares remain the same size, even when the main canvas is zoomed.
                    const transparentPattern = newImageCanvasContext.createPattern(
                        transparentImage.current,
                        'repeat',
                    );
                    if (transparentPattern) {
                        newImageCanvasContext.fillStyle = transparentPattern;
                    }
                    newImageCanvasContext.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                if (editor.storeEditor.image !== null) {
                    readSaveStateImage(editor.storeEditor.image)
                    setBlur(editor.storeEditor.blur)
                }

                if (newImageCanvasRef.current && canvasRef.current && editor.storeEditor.color !== '') {
                    setColor(editor.storeEditor.color)
                    const newImageCanvasContext = newImageCanvasRef.current.getContext('2d');
                    if (newImageCanvasContext) {
                        // Fill the background with the color
                        newImageCanvasContext.fillStyle = editor.storeEditor.color;
                        newImageCanvasContext.fillRect(
                            0,
                            0,
                            newImageCanvasContext.canvas.width,
                            newImageCanvasContext.canvas.height,
                        );

                        setBackgroundIsTransparent(false);

                        // Request update of blur & zoomed version
                        updateZoomedContainer(true);
                        forceRedraw();
                    }
                }
                if (editor.storeEditor.drawnPos.length > 0)
                    setDrawnPos(editor.storeEditor.drawnPos)
                setMode(editor.storeEditor.mode)


                // Initialise the 'zoomed' background container, which contains the background image after
                // zooming/blurring operations
                const zoomedNewImageCanvasContext = zoomedNewImageCanvasRef.current.getContext('2d');
                if (zoomedNewImageCanvasContext) {
                    zoomedNewImageCanvasRef.current.width = canvasRef.current.width;
                    zoomedNewImageCanvasRef.current.height = canvasRef.current.height;
                    zoomedNewImageCanvasContext.drawImage(newImageCanvasRef.current, 0, 0);
                }

                originalImageCanvasRef.current.width = canvasRef.current.width;
                originalImageCanvasRef.current.height = canvasRef.current.height;
                originalImageCanvasRef.current.getContext('2d')?.drawImage(
                    originalImage.current,
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height,
                );

                // Draw everything, and update the load state (there are three load states, and we need to repeat
                // this for each of them, since we don't know which one will load first/last.)
                forceRedraw();
                setPatternLoaded(patternLoaded + 1);

            }
        },
        [originalImageContext, zoomedNewImageCanvasRef, patternLoaded, forceRedraw, originalImage, originalImageCanvasRef, canvasRef, transparentImage, newImageCanvasRef],
    );

    const [drawing, setDrawing] = useState(false);
    // Handle the drawing start
    const handleDragStart = useCallback((event) => {
        if (canvasRef.current && canvasContainer.current) {
            console.log('handleDragStart')
            setDrawing(true);
            const filtered = drawnPos.filter(pos => !pos.undone);
            setDrawnPos(
                [
                    ...filtered
                        .map((pos, index) => ({ ...pos, index })),
                    {
                        // Push a new line, marking it with `isNewLink: true`
                        x: (event.pageX - canvasRef.current.offsetLeft + canvasContainer.current.scrollLeft) / zoom,
                        y: (event.pageY - canvasRef.current.offsetTop + canvasContainer.current.scrollTop) / zoom,
                        isNewLine: true,
                        brushSize,
                        mode,
                        drawn: false,
                        index: filtered.length,
                    },
                ],
            );
        }
    }, [drawnPos, canvasRef, mode, brushSize, zoom]);

    const handleMouseMove = useCallback((event) => {
        // If we're drawing (i.e. a click event has been detected, and no mouseup event has been detected)
        if (drawing && canvasRef.current && canvasContainer.current) {
            setDrawnPos(
                [
                    ...drawnPos,
                    {
                        // Push a continuation of the previous line, marking it with `isNewLink: false`
                        x: (event.pageX - canvasRef.current.offsetLeft + canvasContainer.current.scrollLeft) / zoom,
                        y: (event.pageY - canvasRef.current.offsetTop + canvasContainer.current.scrollTop) / zoom,
                        isNewLine: false,
                        brushSize,
                        mode,
                        drawn: false,
                        index: drawnPos.length,
                    },
                ],
            );
        }
    }, [drawing, drawnPos, canvasRef, mode, brushSize]);

    // On drag end, break out of drawing mode.
    const handleDragEnd = useCallback(() => {
        setDrawing(false);
    }, []);

    useEffect(() => {
        if (patternLoaded) {
            forceRedraw();
        }
    }, [patternLoaded]);

    // Whenever a new line is added, draw it.
    useEffect(() => {
        draw(false);
    }, [drawnPos]);

    // forceNotTransparent can be true (force it), false (don't force anything), or -1 (force transparency)
    const updateZoomedContainer = useCallback((forceNotTransparent: boolean | -1 = false) => {
        if (zoomedNewImageCanvasRef.current && originalImage.current) {
            // Update the canvas size to make sure it's up-to-date
            zoomedNewImageCanvasRef.current.width = divSizing.width * zoom;
            zoomedNewImageCanvasRef.current.height = divSizing.height * zoom;

            const zoomedNewImageCanvasContext = zoomedNewImageCanvasRef.current.getContext('2d');

            if (zoomedNewImageCanvasContext && newImageCanvasRef.current && transparentImage.current) {
                // Get the not-zoomed image
                const transparentPattern = zoomedNewImageCanvasContext.createPattern(
                    transparentImage.current,
                    'repeat',
                );
                if (transparentPattern && ((backgroundIsTransparent && !forceNotTransparent) || forceNotTransparent === -1)) {
                    // If the background is transparent, use a fill instead of an image to keep the size of the
                    // grid squares the same, and ensure that there is no blurring - the grid should never
                    // be rescaled/blurred because it's just an indicator, not a background image.
                    zoomedNewImageCanvasContext.filter = 'none';
                    zoomedNewImageCanvasContext.fillStyle = transparentPattern;
                    zoomedNewImageCanvasContext.fillRect(
                        0,
                        0,
                        divSizing.width * zoom,
                        divSizing.height * zoom,
                    );
                } else {
                    // If we're dealing with a proper, non-transparent background, add the blur as necessary
                    // and draw the image to fill the background.
                    zoomedNewImageCanvasContext.filter = `blur(${imgBlur * zoom}px)`;
                    zoomedNewImageCanvasContext.drawImage(
                        newImageCanvasRef.current,
                        0,
                        0,
                        divSizing.width * zoom,
                        divSizing.height * zoom,
                    );
                }
            }
        }
    }, [zoom, zoomedNewImageCanvasRef, newImageCanvasRef, divSizing, backgroundIsTransparent, imgBlur]);
    const readSaveStateImage = (file: any) => {
        setReadSaveImage(file)
        const fileReader = new FileReader();
        fileReader.onload = (event) => {
            if (event?.target?.result) {
                // Read the file, and load it into an image
                const image = new Image();
                image.onload = () => {
                    if (newImageCanvasRef.current && originalImage.current) {
                        const newImageCanvasContext = newImageCanvasRef.current.getContext('2d');
                        if (newImageCanvasContext) {
                            // Clear the canvas
                            newImageCanvasContext.clearRect(
                                0,
                                0,
                                newImageCanvasContext.canvas.width,
                                newImageCanvasContext.canvas.height,
                            );
                            // Load the new image into the (hidden) background image container, accounting for
                            // whether it is portrait or landscape to match the aspect ratio of the foreground
                            // image, and centering it into the middle of the container.
                            if ((image.width / image.height) > (divSizing.width / divSizing.height)) {
                                newImageCanvasContext.drawImage(
                                    image,
                                    -(
                                        (divSizing.height / image.height)
                                        * image.width / 2 - divSizing.width / 2
                                    ),
                                    0,
                                    (divSizing.height / image.height) * image.width,
                                    divSizing.height,
                                );
                            } else {
                                newImageCanvasContext.drawImage(
                                    image,
                                    0,
                                    -(
                                        (divSizing.width / image.width)
                                        * image.height / 2 - divSizing.height / 2
                                    ),
                                    divSizing.width,
                                    (divSizing.width / image.width) * image.height,
                                );
                            }

                            setBackgroundIsTransparent(false);
                            // Request the zoomed background image container to update, which also accounts for
                            // zoom and blur
                            updateZoomedContainer(true);

                            forceRedraw();
                        }
                    }
                };

                const result = event.target.result;
                if (result && typeof result === 'string') {
                    image.src = result;
                }
            }
        };

        // Read the image
        fileReader.readAsDataURL(file);
    }
    // Handles upload of replacement background images
    const readImage = useCallback((filePickerEvent: React.ChangeEvent<HTMLInputElement>) => {
        if (!filePickerEvent.target || !filePickerEvent.target.files || !filePickerEvent.target.files[0]) return;
        setColor('')
        const fileReader = new FileReader();
        fileReader.onload = (event) => {
            if (event?.target?.result) {
                // Read the file, and load it into an image
                const image = new Image();
                image.onload = () => {
                    if (newImageCanvasRef.current && originalImage.current) {
                        const newImageCanvasContext = newImageCanvasRef.current.getContext('2d');
                        if (newImageCanvasContext) {
                            // Clear the canvas
                            newImageCanvasContext.clearRect(
                                0,
                                0,
                                newImageCanvasContext.canvas.width,
                                newImageCanvasContext.canvas.height,
                            );
                            // Load the new image into the (hidden) background image container, accounting for
                            // whether it is portrait or landscape to match the aspect ratio of the foreground
                            // image, and centering it into the middle of the container.
                            if ((image.width / image.height) > (divSizing.width / divSizing.height)) {
                                newImageCanvasContext.drawImage(
                                    image,
                                    -(
                                        (divSizing.height / image.height)
                                        * image.width / 2 - divSizing.width / 2
                                    ),
                                    0,
                                    (divSizing.height / image.height) * image.width,
                                    divSizing.height,
                                );
                            } else {
                                newImageCanvasContext.drawImage(
                                    image,
                                    0,
                                    -(
                                        (divSizing.width / image.width)
                                        * image.height / 2 - divSizing.height / 2
                                    ),
                                    divSizing.width,
                                    (divSizing.width / image.width) * image.height,
                                );
                            }

                            setBackgroundIsTransparent(false);
                            // Request the zoomed background image container to update, which also accounts for
                            // zoom and blur
                            updateZoomedContainer(true);

                            forceRedraw();
                        }
                    }
                };

                const result = event.target.result;
                if (result && typeof result === 'string') {
                    image.src = result;
                }
            }
        };

        // Read the image
        setReadSaveImage(filePickerEvent.target.files[0])
        fileReader.readAsDataURL(filePickerEvent.target.files[0]);

        // Clear the file picker, so the same image can be uploaded if necessary and still trigger a 'change' event
        filePickerEvent.target.files = null;
        filePickerEvent.target.value = '';
    }, [newImageCanvasRef, context, canvasRef, draw, forceRedraw, updateZoomedContainer, divSizing]);

    const setColoredBackground = useCallback((event) => {
        setReadSaveImage(null)
        setColor(event.target.value)
        if (newImageCanvasRef.current && canvasRef.current) {
            const newImageCanvasContext = newImageCanvasRef.current.getContext('2d');
            if (newImageCanvasContext) {
                // Fill the background with the color
                newImageCanvasContext.fillStyle = event.target.value;
                newImageCanvasContext.fillRect(
                    0,
                    0,
                    newImageCanvasContext.canvas.width,
                    newImageCanvasContext.canvas.height,
                );

                setBackgroundIsTransparent(false);

                // Request update of blur & zoomed version
                updateZoomedContainer(true);
                forceRedraw();
            }
        }
    }, [newImageCanvasRef, canvasRef, context, draw, forceRedraw]);

    const undo = useCallback(() => {
        // If there's nothing to undo, exit early
        if (!drawnPos.filter(e => !e.undone).length) return;

        // Find the last new line that was started
        const lastNewLine = drawnPos.reduce((a, e, i) => e.isNewLine && !e.undone ? i : a, 0);
        if (context && zoomedNewImageCanvasRef.current) {
            // Redraw everything
            clearCanvas();
            context.drawImage(zoomedNewImageCanvasRef.current, 0, 0);
            insertForegroundImage();

            setDrawnPos(
                [
                    // Mark everything since the start of the lastest, non-undone line as 'undone' (hidden)
                    ...drawnPos.slice(0, lastNewLine),
                    ...drawnPos.slice(lastNewLine).map(pos => ({
                        ...pos,
                        undone: true,
                        force: true, // Mark it as force: true, so when the setState finishes, it will be forced.
                    })),
                ],
            );
        }
    }, [forceRedraw, drawnPos, clearCanvas, zoomedNewImageCanvasRef]);

    const redo = useCallback(() => {
        if (!drawnPos.filter(e => e.undone).length) return;

        // Find all of the lines that were undone
        const newLines = drawnPos
            .map((e, i) => e.isNewLine && e.undone ? i : -1)
            .filter(e => e !== -1);
        if (context && zoomedNewImageCanvasRef.current) {
            clearCanvas();
            context.drawImage(zoomedNewImageCanvasRef.current, 0, 0);
            insertForegroundImage();

            setDrawnPos(
                [
                    // Mark everything between the first and second undone lines as not-undone
                    ...drawnPos.slice(0, newLines[0]),
                    ...drawnPos.slice(newLines[0], newLines[1] || undefined).map(pos => ({
                        ...pos,
                        undone: false,
                        force: true,
                    })),
                    ...drawnPos.slice(newLines[1] || drawnPos.length),
                ],
            );
        }
    }, [forceRedraw, drawnPos, clearCanvas, zoomedNewImageCanvasRef]);

    // Because of the delay with setState, we need an alternative approach to prepare an image for downloading,
    // since otherwise we can't properly await the background being cleared and the zooming being set. So, we just
    // do one of the two (zooming), and leave a variable (not a state) to do the rest when a useEffect detects the
    // zoom as complete.
    const download = useCallback(() => {
        if (canvasRef.current && originalImage.current) {
            waitingOnDownload = zoom;

            // Zoom in the canvas to the original size, so that the resolutions match
            setZoom(originalImage.current.width / divSizing.width);
        }
    }, [canvasRef, zoom, backgroundIsTransparent, setColoredBackground, clearCanvas, forceRedraw, originalImage]);

    // On zoom change
    useEffect(() => {
        // Update the sizing of the canvas, and scroll to the center
        if (canvasRef.current && canvasContainer.current) {
            canvasRef.current.width = divSizing.width * zoom;
            canvasRef.current.height = divSizing.height * zoom;

            canvasContainer.current.scrollLeft = divSizing.width * (zoom - 1) / 2;
            canvasContainer.current.scrollTop = divSizing.height * (zoom - 1) / 2;
        }

        // Draw the foreground image, but scaled as per the zoom
        if (originalImage.current && originalImageContext && originalImageCanvasRef.current) {
            originalImageCanvasRef.current.width = divSizing.width * zoom;
            originalImageCanvasRef.current.height = divSizing.height * zoom;
            originalImageContext.drawImage(
                originalImage.current,
                0,
                0,
                divSizing.width * zoom,
                divSizing.height * zoom,
            );
            updateZoomedContainer();
        }

        // Redraw everything
        forceRedraw();
        setDrawnPos(
            drawnPos.map(pos => ({ ...pos, force: true })),
        );

        if (waitingOnDownload && canvasRef.current) {
            // Redraw everything without the background grid if it's transparent (because we don't want the
            // grid to be visible in the export)
            if (backgroundIsTransparent) {
                forceRedraw(true);
            }

            // Download it (using an NPM module)
            triggerBase64Download(canvasRef.current.toDataURL('image/png', 1.0), 'background-removal-edit');

            // 'Clear' the background, i.e. put the transparent grid back.
            if (backgroundIsTransparent) {
                clearBackgroundColor();
            }

            // Redraw everything
            updateZoomedContainer();
            forceRedraw();

            // Reset the zoom to what it was before downloading began
            setZoom(waitingOnDownload);
            waitingOnDownload = 0;
        }
        if (waitingOnSave && canvasRef.current) {
            // Redraw everything without the background grid if it's transparent (because we don't want the
            // grid to be visible in the export)
            if (backgroundIsTransparent) {
                forceRedraw(true);
            }

            // save it
            saveFun(canvasRef.current.toDataURL('image/png', 1.0), editor.editor.idx, { drawnPos, mode, color, image: readSaveImage, blur: imgBlur })
 
            // 'Clear' the background, i.e. put the transparent grid back.
            if (backgroundIsTransparent) {
                clearBackgroundColor();
            }

            // Redraw everything
            updateZoomedContainer();
            forceRedraw();

            // Reset the zoom to what it was before downloading began
            setZoom(waitingOnSave);
            waitingOnSave = 0;
        }
    }, [zoom]);

    const clearBackgroundColor = useCallback(() => {
        setColor('')
        setReadSaveImage(null)
        if (newImageCanvasRef.current) {
            const newImageCanvasContext = newImageCanvasRef.current.getContext('2d');

            if (newImageCanvasContext && transparentImage.current) {
                // Draw the transparency grid
                const transparentPattern = newImageCanvasContext.createPattern(
                    transparentImage.current,
                    'repeat',
                );
                if (transparentPattern) {
                    newImageCanvasContext.fillStyle = transparentPattern;
                    newImageCanvasContext.fillRect(
                        0,
                        0,
                        newImageCanvasContext.canvas.width,
                        newImageCanvasContext.canvas.height,
                    );

                    // Mark the background as transparent
                    setBackgroundIsTransparent(true);

                    // Force the zoom container to work as transparent, even if the setBackgroundIsTransparent
                    // setState hasn't completed yet
                    updateZoomedContainer(-1);
                    forceRedraw();
                }
            }
        }
    }, [newImageCanvasRef, transparentImage, updateZoomedContainer, forceRedraw]);

    // When the blur updates, redraw everything
    useEffect(() => {
        updateZoomedContainer();
        forceRedraw();
    }, [imgBlur, backgroundIsTransparent]);
    const openColorPanel = () => {
        if (colorRef.current) {
            colorRef.current.click()
        }
    }
    const openPhoto = () => {
        if (photoRef.current) {
            photoRef.current.click()
        }
    }
    const imgButtonWidth = 90;
    const imgButtonHeight = 90;
    // Work out the placement of the foreground image over the image icon buttons
    const imgButtonStyles = {
        width: originalImage.current ? (
            // If it's landscape, define the width and leave the height to auto
            originalImage.current.width > originalImage.current.height
                ? undefined
                : imgButtonWidth
        ) : 0,
        height: originalImage.current ? (
            // If it's portrait, define the height and leave the width to auto
            originalImage.current.height >= originalImage.current.width
                ? undefined
                : imgButtonHeight
        ) : 0,
        // Align it to be in the center
        left: originalImage.current ? (
            originalImage.current.width > originalImage.current.height
                ? -(
                    (imgButtonHeight / originalImage.current.height)
                    * originalImage.current.width / 2 - imgButtonWidth / 2
                )
                : 0
        ) : 0,
        top: originalImage.current ? (
            originalImage.current.height >= originalImage.current.width
                ? -(
                    (imgButtonWidth / originalImage.current.width)
                    * originalImage.current.height / 2 - imgButtonHeight / 2
                )
                : 0
        ) : 0,
    };
    const saveButton = useCallback(() => {
        if (canvasRef.current && originalImage.current) {
            waitingOnSave = zoom;

            // Zoom in the canvas to the original size, so that the resolutions match
            setZoom(originalImage.current.width / divSizing.width);
        }
    }, [canvasRef, zoom, backgroundIsTransparent, setColoredBackground, clearCanvas, forceRedraw, originalImage]);


    return (
        <>

            <div
                className='editorSection py-5' style={{ width: '950px', overflowX: 'scroll' }}
            >
                <div className="d-flex editor-inner">
                    <div className="p-2">
                        <div className="row">
                            <div className="col-md-8">
                                <div className='zoom-range d-flex'>
                                    <button className="minus mr-2" onClick={() => zoom >= 1.5 && setZoom(zoom - 0.5)}>
                                        <i className="fas fa-minus"></i>
                                    </button>
                                    <input
                                        type='text'
                                        readOnly={true}
                                        value={`${zoom.toFixed(1)}x`}
                                    />
                                    <button className="plus ml-2" onClick={() => zoom <= 4.5 && setZoom(zoom + 0.5)}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="rotate-container text-right">
                                    <button className="rotate-left mr-1" onClick={undo}>
                                        <i className="fas fa-undo"></i>
                                    </button>
                                    <button className="rotate-right" onClick={redo}>
                                        <i className="fas fa-redo"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="editor-img-area">
                         <div
                                    id='cursor'
                                    ref={cursorRef}
                                    onMouseMove={(e) => {
                                        handleMouseMove(e);
                                        updateCursor(e);
                                    }}
                                    onMouseDown={handleDragStart}
                                    onMouseUp={handleDragEnd}
                                ></div> 
                            <div
                                style={{
                                    width: divSizing.width - 1,
                                    height: divSizing.height,
                                    overflow: zoom > 1 ? 'auto' : 'hidden'
                                }}
                                className='canvas-container'
                                ref={canvasContainer}
                                onMouseMove={(e) => {
                                    handleMouseMove(e);
                                    updateCursor(e);
                                }}
                            >
                               
                                <canvas
                                    className="canvas"
                                    ref={canvasRef}
                                    onMouseDown={handleDragStart}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleDragEnd}
                                />
                            </div>
                        </div>

                        <div className="row justify-content-center">
                            <div className="col-md-4 text-right pr-0">
                                {/* <button className="btn btn-primary" onClick={download}>Download</button> */}
                            </div>
                            <div className="col-md-4 pl-2">
                                <button className="btn btn-success" onClick={saveButton}>Save</button>
                            </div>
                            <div className="col-md-4 text-right pr-0">
                                {/* <button className="btn btn-primary" onClick={download}>Download</button> */}
                            </div>

                        </div>

                    </div>
                    <div className="pr-0">
                        <div className="text-right mb-2">
                            <button className="close-btn" onClick={closeFun}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <ul className="nav nav-tabs" id="myTab" role="tablist">
                            <li className="nav-item">
                                <a className="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true"><h5><i className="fas fa-layer-group mr-2"></i>BACKGROUND</h5></a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" id="contact-tab" data-toggle="tab" href="#contact" role="tab" aria-controls="contact" aria-selected="false"><h5><i className="fas fa-paint-brush mr-2"></i>ERASER / RESTORE</h5></a>
                            </li>
                        </ul>
                        <div className="tab-content" id="myTabContent">
                            <div className="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">
                                <div className="p-3 text-center">
                                    <div className="mb-2 text-left">
                                        <small>Blur</small>
                                    </div>
                                    <div className='zoom-range d-flex'>
                                        <button className="minus mr-2" onClick={() => imgBlur >= 1 && setBlur(imgBlur - 1)}>
                                            <i className="fas fa-minus"></i>
                                        </button>
                                        <input
                                            type='text'
                                            readOnly={true}
                                            value={`${imgBlur}px`}
                                        />
                                        <button className="plus ml-2" ref={blurRef} onClick={() => imgBlur <= 9 && setBlur(imgBlur + 1)}>
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    <div className="mt-3 text-center">
                                        <div className="toggle-btn">
                                            <button className={classnames("erase", { 'eractive': photo })} onClick={() => setPhoto(true)}>Photo</button>
                                            <button className={classnames("restore", { 'eractive': !photo })} onClick={() => setPhoto(false)}>Color</button>
                                        </div>
                                        <div className={classnames("mt-3 text-left", { 'd-none': !photo })}>
                                            <small>Photo</small>
                                            <div className="row justify-content-left">
                                                <div className="col-md-3">
                                                    <div className="upload-photo pt-2" onClick={openPhoto}>
                                                        <i className="fas fa-cloud-upload-alt"></i>
                                                        <div className="text">
                                                            Select Photo
                                                                    </div>
                                                        <input
                                                            style={{
                                                                marginTop: '10px',
                                                                position: 'absolute',
                                                                marginLeft: '-50px',
                                                                opacity: 0
                                                            }}
                                                            ref={photoRef}
                                                            type='file'
                                                            onChange={readImage}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="upload-photo p-2" onClick={clearBackgroundColor}>
                                                        <img src={require('./transparent.png')} width="100%" height="100%" alt="img" />

                                                    </div>
                                                </div>
                                                <div className="col-md-3"></div>
                                            </div>
                                        </div>
                                        <div className={classnames("mt-3 text-left", { 'd-none': photo })}>
                                            <small>Color</small>
                                            <div className="row justify-content-left">
                                                <div className="col-md-3">
                                                    <div className="upload-photo" onClick={openColorPanel}>
                                                        <img src={require('./colors.png')} width="100%" height="100%" alt="img" />
                                                        <input
                                                            style={{
                                                                marginTop: '10px',
                                                                position: 'absolute',
                                                                marginLeft: '-50px',
                                                                opacity: 0
                                                            }}
                                                            type='color'
                                                            ref={colorRef}
                                                            onChange={setColoredBackground}
                                                            defaultValue='#ffffff'
                                                        />

                                                    </div>
                                                </div>
                                                <div className="col-md-3"></div>
                                                <div className="col-md-3"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="tab-pane fade" id="contact" role="tabpanel" aria-labelledby="contact-tab">
                                <div className="p-3 text-center">
                                    <div className="toggle-btn">
                                        <button className={classnames("erase", { 'eractive': erase })} onClick={() => { setErase(true); setMode(ToolMode.Eraser) }}>Erase</button>
                                        <button className={classnames("restore", { 'eractive': !erase })} onClick={() => { setErase(false); setMode(ToolMode.Restore) }}>Restore</button>
                                    </div>
                                    <div className="erslider mt-3">
                                        <div className="form-group text-left">
                                            <small>Brush Size</small>

                                            <input style={{ width: '129px' }} type="range" className="form-control-range slider mt-2" id="formControlRange"
                                                min={3}
                                                max={21}
                                                step={3}
                                                onChange={(event) => setBrushSize(event.target.valueAsNumber)}
                                                value={brushSize}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='hidden-item-container'>
                <canvas
                    ref={originalImageCanvasRef}
                    className='original-image'
                />
                <canvas
                    ref={newImageCanvasRef}
                    className='new-image'
                />
                <canvas
                    ref={zoomedNewImageCanvasRef}
                    className='zoomed-new-image'
                />
                {editor.restoredImage ? <img
                    src={editor.restoredImage}
                    ref={removedImage}
                    onLoad={onImageLoad}
                    className='removed-image'
                    alt={"removedimage"}
                /> : <img
                        src={images.removedImage}
                        ref={removedImage}
                        onLoad={onImageLoad}
                        className='removed-image'
                        alt={"removedimage"}
                    />

                }

                <img
                    src={images.orignalImage}
                    ref={originalImage}
                    onLoad={onImageLoad}
                    className='original-image'
                    alt={"originalimage"}
                />
                <img
                    src={transparent}
                    ref={transparentImage}
                    onLoad={onImageLoad}
                    className='transparent-image'
                    alt={"transparentimage"}
                />
            </div>

        </>
    );
};
