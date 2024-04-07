import React from 'react';
import styles from './LandingRoute.module.css';
import { P5CanvasInstance, ReactP5Wrapper, SketchProps} from "@p5-wrapper/react";
import first_plop from "assets/first_plop.flac"
import second_plop from "assets/second_plop.flac"
import third_plop from "assets/third_plop.flac"
import fourth_plop from "assets/fourth_plop.flac"
import discovery_sound from "assets/discovery.flac"
import error_sound from "assets/error.flac"
import new_sound from "assets/new.flac"

interface Element {
  symbol: string;
  emoji: string;
  discovery?: boolean;
  timestamp?: number;
}


type MySketchProps = SketchProps & {
  selectedElement: Element | null;
  onElementClick: (element: Element) => void;
  combineElement: (symbol1: string, symbol2: string, callback: (element: Element) => void) => void;
  splitElement: (symbol: string, callback: (element: Element[]) => void) => void;
  symbolCombos: { [key: string]: Element };
  playPlop: () => void
};

interface PlacedElement {
  element: Element;
  x: number;
  y: number;
}

interface Placeholder {
  x: number;
  y: number;
  id: string;
}

const sketch = (p5: P5CanvasInstance<MySketchProps>) => {
  let placeholders: Placeholder[] = [];
  let placedElements: PlacedElement[] = []
  let selectedElement: Element | null = null;
  let onElementClick: (element: Element) => void = () => {};
  let combineElement: (symbol1: string, symbol2: string, callback: (element: Element) => void) => void = () => {}
  let splitElement: (symbol: string, callback: (element: Element[]) => void) => void = () => {}
  let symbolCombos: { [key: string]: Element } = {}
  let playPlop: () => void
  let selectedForDragging: PlacedElement | null = null; 

  const calculateTextBounds = (text: string, x: number, y: number, padding = 10) => {
    const textWidth = p5.textWidth(text);
    const textAscent = p5.textAscent();
    const textDescent = p5.textDescent();
    return {
      x: x - textWidth / 2 - padding,
      y: y - textAscent / 2 - padding,
      w: textWidth + padding * 2,
      h: textAscent + textDescent + padding * 2,
    };
  }

  function generateUniqueId(): string {
    return Math.random().toString(36);
  }

  function checkOverlap(newElement: PlacedElement, existingElement: PlacedElement): boolean {
    // Get the bounding boxes for each element
    const newElementBounds = calculateTextBounds(`${newElement.element.emoji} ${newElement.element.symbol}`, newElement.x, newElement.y);
    const existingElementBounds = calculateTextBounds(`${existingElement.element.emoji} ${existingElement.element.symbol}`, existingElement.x, existingElement.y);
    
    // Check if the bounding boxes overlap
    // Two rectangles overlap if the area of their intersection is positive
    return !(
      newElementBounds.x > existingElementBounds.x + existingElementBounds.w ||
      newElementBounds.x + newElementBounds.w < existingElementBounds.x ||
      newElementBounds.y > existingElementBounds.y + existingElementBounds.h ||
      newElementBounds.y + newElementBounds.h < existingElementBounds.y
    );
  }

  const isInside = (px: number, py: number, rect: { x: number; y: number; w: number; h: number }) => {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  };

  p5.mousePressed = () => {
    if (p5.mouseButton === p5.RIGHT) {
      for (let i = 0; i < placedElements.length; i++) {
        const placed = placedElements[i];
        const bounds = calculateTextBounds(`${placed.element.emoji} ${placed.element.symbol}`, placed.x, placed.y);
        if (isInside(p5.mouseX, p5.mouseY, bounds)) {
          playPlop();
          
          // Create a placeholder for the element being split
          let placeholderId = generateUniqueId();
          const placeholder = {
            x: placed.x,
            y: placed.y,
            id: placeholderId,
            // You might want to add more properties to indicate it's a placeholder visually
          };
          placeholders.push(placeholder);
  
          // Remove the original element immediately
          placedElements.splice(i, 1);
          
          splitElement(placed.element.symbol, (response: Element[]) => {
            // Find and remove the placeholder after the split operation completes
            const placeholderIndex = placeholders.findIndex(pe => pe.id === placeholderId);
            if (placeholderIndex !== -1) {
              placeholders.splice(placeholderIndex, 1);
            }
  
            if (response && response.length === 2 && response.every(el => el.symbol !== "" && el.emoji !== "")) {
              // Calculate new positions for the split elements
              const leftPosition = { x: placeholder.x - 50, y: placeholder.y }; // Adjust 50 to your needs
              const rightPosition = { x: placeholder.x + 50, y: placeholder.y }; // Adjust 50 to your needs
  
              // Add the new elements to placedElements
              placedElements.push({
                element: response[0],
                x: leftPosition.x,
                y: leftPosition.y
              });
              placedElements.push({
                element: response[1],
                x: rightPosition.x,
                y: rightPosition.y
              });
            } else {
              // Handle the case where the split is not successful or doesn't return two elements
              console.error("Split operation failed or didn't return two elements");
            }
          });
          return; // Exit the function after handling the right-click
        }
      }
    } else if (p5.mouseButton === p5.CENTER) {
      playPlop();
      duplicate();
    } else {
      // Handle left-click for dragging
      selectedForDragging = null;
      for (let placed of placedElements) {
        const bounds = calculateTextBounds(`${placed.element.emoji} ${placed.element.symbol}`, placed.x, placed.y);
        if (isInside(p5.mouseX, p5.mouseY, bounds)) {
          playPlop();
          selectedForDragging = placed;
          break;
        }
      }
    }
  };

  p5.mouseDragged = () => {
    if (selectedForDragging && !selectedElement) { // Check if there is an element selected for dragging
      onElementClick(selectedForDragging.element);
      placedElements = placedElements.filter(pe => pe !== selectedForDragging);
      selectedForDragging = null; // Clear the selected element after dragging
    }
  };

  const duplicate = () => {
    if (!selectedElement) {
      for (let placed of placedElements) {
        const bounds = calculateTextBounds(`${placed.element.emoji} ${placed.element.symbol}`, placed.x, placed.y);
        if (isInside(p5.mouseX, p5.mouseY, bounds)) {
          const copy = { ...placed.element }; // Assuming shallow copy is sufficient
          const offsetX = 10; // Adjust the offset as needed
          const offsetY = -10; // Adjust the offset as needed
          const copiedElement = {
            element: copy,
            x: placed.x + offsetX,
            y: placed.y + offsetY
          };
          const bounds = calculateTextBounds(`${copiedElement.element.emoji} ${copiedElement.element.symbol}`, copiedElement.x, copiedElement.y);
          if (bounds.x + bounds.w <= p5.width - 350) {
            placedElements.push(copiedElement);
          }
          break;
        }
      }
    }
  }

  p5.doubleClicked = () => {
    duplicate()
  };

  p5.setup = () => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight);
    p5.textAlign(p5.CENTER, p5.CENTER); 
  };

  p5.updateWithProps = (props: MySketchProps) => {
    if (!props.selectedElement && selectedElement) {
      const newPlacedElement = { element: selectedElement, x: p5.mouseX, y: p5.mouseY };
      const overlappingElementIndex = placedElements.findIndex(pe => checkOverlap(newPlacedElement, pe));

      if (overlappingElementIndex !== -1) {
        const [overlappingElement] = placedElements.splice(overlappingElementIndex, 1);

        let placeholderId = generateUniqueId()

        const placeholder = {
          x: p5.mouseX,
          y: p5.mouseY,
          id: placeholderId,
        };

        placeholders.push(placeholder);

        combineElement(overlappingElement.element.symbol, selectedElement.symbol, (response: Element) => {
          const placeholderIndex = placeholders.findIndex(pe => pe.id === placeholder.id);
          if (placeholderIndex !== -1) {
            placeholders.splice(placeholderIndex, 1);
            
            if (response.symbol != "" && response.emoji != "") {

              placedElements.push({
                element: { symbol: response.symbol, emoji: response.emoji, discovery: response.discovery },
                x: placeholder.x,
                y: placeholder.y
              });
            }

          }
        });
      } else {
        const bounds = calculateTextBounds(`${newPlacedElement.element.emoji} ${newPlacedElement.element.symbol}`, newPlacedElement.x, newPlacedElement.y);
        if (bounds.x + bounds.w <= p5.width - 350) {
          placedElements.push(newPlacedElement);
        }
      }
    }
    selectedElement = props.selectedElement
    onElementClick = props.onElementClick
    combineElement = props.combineElement
    splitElement = props.splitElement
    symbolCombos = props.symbolCombos
    playPlop = props.playPlop
  };

  p5.draw = () => {
    p5.clear();
  
    placedElements.forEach((placed) => {
      const text = `${placed.element.emoji} ${placed.element.symbol}`;
      const bounds = calculateTextBounds(text, placed.x, placed.y);
  
      // Compute the symbol combination key with the currently selected element
      p5.stroke(0); // Default stroke color (black) if no element is selected
      p5.strokeWeight(1); // Default stroke weight

      if (selectedElement) {
        const symbols = [placed.element.symbol, selectedElement.symbol].sort();
        const symbolKey = symbols.join("+++");
  
        if (!symbolCombos[symbolKey]) {
          p5.stroke(0, 0, 255); 
          p5.strokeWeight(2); // Make the outline thicker for visibility
        } 
      }
  
      // Fill color logic for discovery
      p5.fill(255); // Default fill color
      if (placed.element.discovery) {
        p5.fill(255, 255, 0); // Yellow fill for discovery elements
      }
      p5.rect(bounds.x, bounds.y, bounds.w, bounds.h);


      p5.noStroke(); // Disable stroke for text drawing
      p5.fill(0); // Text color
      p5.text(text, placed.x, placed.y); // Draw the text
    });
  
    placeholders.forEach((placeholder) => {
      const text = "pending";
      const bounds = calculateTextBounds(text, placeholder.x, placeholder.y);
      p5.stroke(0);
      p5.noFill();
      p5.strokeWeight(1);
      p5.rect(bounds.x, bounds.y, bounds.w, bounds.h);
      p5.noStroke();
      p5.fill(0);
      p5.text(text, placeholder.x, placeholder.y);
    });
  
    if (selectedElement) {
      const { emoji, symbol } = selectedElement;
      p5.text(`${emoji} ${symbol}`, p5.mouseX, p5.mouseY);
    }
  };
  

  p5.windowResized = () => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };
};

interface SidebarProps {
  elements: Element[];
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  symbolCombos: { [key: string]: Element };
  setSymbolCombos: React.Dispatch<React.SetStateAction<{ [key: string]: Element }>>;
  inverseSymbolCombos: { [key: string]: Element[] };
  setInverseSymbolCombos: React.Dispatch<React.SetStateAction<{ [key: string]: Element[] }>>;
  onElementClick: (element: Element) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ elements, setElements, symbolCombos, setSymbolCombos, onElementClick, inverseSymbolCombos, setInverseSymbolCombos }) => {
  const [sortedElements, setSortedElements] = React.useState<Element[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortCriterion, setSortCriterion] = React.useState<string>('time');
  const [isAscending, setIsAscending] = React.useState<boolean>(true);
  const [pinnedElements, setPinnedElements] = React.useState(new Set());

  const handleElementPointerDown = (event: React.PointerEvent<HTMLDivElement>, element: Element) => {
    if (event.altKey) {
      event.stopPropagation();
      setPinnedElements((prevPinned) => {
        const newPinned = new Set(prevPinned);
        if (newPinned.has(element.symbol)) {
          newPinned.delete(element.symbol);
        } else {
          newPinned.add(element.symbol);
        }
        return newPinned;
      });
    } else {
      onElementClick(element);
    }
  };

  const directCombosMap: {[elementSymbol: string]: string[]} = {};
  Object.entries(symbolCombos).forEach(([key, value]) => {
    const comboText = key.split('+++').sort().map(symbol => {
      const foundElement = elements.find(element => element.symbol === symbol);
      return foundElement ? `${foundElement.symbol} (${foundElement.emoji})` : '';
    }).join(' + ');
    
    if (!directCombosMap[value.symbol]) {
      directCombosMap[value.symbol] = [comboText];
    } else {
      directCombosMap[value.symbol].push(comboText);
    }
  });

  // Precompute inverse combinations
  const inverseCombosMap: {[elementSymbol: string]: string[]} = {};
  Object.entries(inverseSymbolCombos).forEach(([key, value]) => {
    value.forEach(el => {
      const fromElement = elements.find(element => element.symbol === key);
      const otherElement = value.find(element => element.symbol !== el.symbol);
      const comboText = fromElement ? `${fromElement.symbol} (${fromElement.emoji}) = ${el.symbol} (${el.emoji}) + ${otherElement?.symbol} (${otherElement?.emoji})` : '';

      if (!inverseCombosMap[el.symbol]) {
        inverseCombosMap[el.symbol] = [comboText];
      } else {
        inverseCombosMap[el.symbol].push(comboText);
      }
    });
  });

  // Function to get hover text by combining precomputed texts
  const getHoverText = (elementSymbol: string) => {
    const directText = directCombosMap[elementSymbol]?.join('\n') || '';
    const inverseText = inverseCombosMap[elementSymbol]?.join('\n') || '';
    return [directText, inverseText].filter(text => text).join('\n\n');
  };

  const exportData = () => {
    const data = { elements, symbolCombos, inverseSymbolCombos };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'infini-craft-save.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
  
    if (!event.target.files || event.target.files.length === 0) {
      alert("Please select a file to import."); // Basic error handling
      return;
    }
  
    fileReader.readAsText(event.target.files[0], "UTF-8");
  
    fileReader.onload = e => {
      try {
        const parsedData = JSON.parse(e.target!.result!.toString());
        const elements = parsedData?.elements || [];
        const symbolCombos = parsedData?.symbolCombos || {};
        const inverseSymbolCombos = parsedData?.inverseSymbolCombos || {};
    
        // Validate the format of the file
        if (elements && !Array.isArray(elements) || typeof symbolCombos !== 'object') {
          alert("Invalid file format.");
          return;
        }
    
        // Validate and prepare elements
        const validElements = elements.filter((el: Element) => el.symbol && el.emoji).map((el: Element) => ({
          ...el,
          discovery: false // Set discovery to false for all elements
        }));
    
        if (validElements.length !== elements.length) {
          alert("Some elements are invalid and will be ignored.");
        }
    
        // Validate and prepare symbolCombos
        const validSymbolCombos = Object.keys(symbolCombos).reduce((acc: { [key: string]: Element }, key: string) => {
          const el = symbolCombos[key];
          if (key && el.symbol && el.emoji) {
            acc[key] = { ...el, discovery: false }; // Set discovery to false
            return acc;
          } else {
            return acc; // Ignore invalid entries
          }
        }, {});

        const validInverseSymbolCombos = Object.keys(inverseSymbolCombos).reduce((acc: { [key: string]: Element[] }, key: string) => {
          const elements = inverseSymbolCombos[key];
          // Check if the key exists, and both elements in the array have valid symbols and emojis
          if (key && elements.length === 2 && elements.every((el: Element) => el.symbol && el.emoji)) {
            // Here we assume you want to keep the elements as is but ensure discovery is set to false
            // since it's a valid combo being retrieved from storage
            const adjustedElements = elements.map((el: Element) => ({ ...el, discovery: false }));
            acc[key] = adjustedElements;
          }
          // Ignore invalid entries
          return acc;
        }, {});
    
        // Assuming 'currentElements' and 'currentSymbolCombos' contain the current state
        // Merge the input elements and symbolCombos with the current ones
        // Concatenating current elements with new valid elements
        setElements((curr: Element[]) => {
          const newElements = validElements.filter((newEl: Element) => !curr.some(currEl => currEl.symbol === newEl.symbol && currEl.emoji === newEl.emoji));
          return [...curr, ...newElements];
        });
        // Merging current symbol combos with new valid symbol combos
        setSymbolCombos((curr) => ({...validSymbolCombos, ...curr }));
        setInverseSymbolCombos((curr) => ({...validInverseSymbolCombos, ...curr }));
    
      } catch (error) {
        alert("An error occurred while reading the file: " + error);
      }
    };
  
    fileReader.onerror = () => {
      alert("Failed to read the file.");
    };
  };

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent capturing key presses when focusing on other input fields
      if (document.activeElement && (document.activeElement as HTMLInputElement).tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'text') {
        return;
      } else if (event.key === 'Escape') {
        setSearchQuery('');
      } else if (event.key === 'Backspace') {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (event.key.length === 1) {
        setSearchQuery((prev) => prev + event.key);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  React.useEffect(() => {
    // Filter elements based on search query
    const filteredElements = elements.filter((element) =>
      element.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.emoji.includes(searchQuery)
    );

    const pinnedElementsArray = filteredElements.filter(element => pinnedElements.has(element.symbol));
    const unpinnedElementsArray = filteredElements.filter(element => !pinnedElements.has(element.symbol));

    // Sort elements based on the selected criterion
    const sortFunction = (a: Element, b: Element) => {
      const aIsPinned = pinnedElements.has(a.symbol);
      const bIsPinned = pinnedElements.has(b.symbol);

      // Prioritize pinned elements

      // If both are pinned or not, sort based on search query and other criteria
      const queryMatchA = a.symbol.toLowerCase().startsWith(searchQuery.toLowerCase()) || a.emoji.startsWith(searchQuery);
      const queryMatchB = b.symbol.toLowerCase().startsWith(searchQuery.toLowerCase()) || b.emoji.startsWith(searchQuery);

      if (queryMatchA && !queryMatchB) return 1;
      if (!queryMatchA && queryMatchB) return -1;

      if (aIsPinned && !bIsPinned) return 1;
      if (!aIsPinned && bIsPinned) return -1;

      switch (sortCriterion) {
        case 'discovery':
          return (a.discovery === b.discovery) ? 0 : a.discovery ? -1 : 1;
        case 'emoji':
          return a.emoji.localeCompare(b.emoji);
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        default:
          return (a.timestamp || 0) - (b.timestamp || 0);
      }
    }

    const sortedPinnedElements = pinnedElementsArray.sort(sortFunction);
    const sortedUnpinnedElements = unpinnedElementsArray.sort(sortFunction);

    let finalSortedArray;
    if (isAscending) {
      finalSortedArray = sortedPinnedElements.concat(sortedUnpinnedElements);
    } else {
      // Reverse each array separately to maintain pinned on top when reversed
      finalSortedArray = sortedPinnedElements.reverse().concat(sortedUnpinnedElements.reverse());
    }

    setSortedElements(finalSortedArray);
  }, [elements, searchQuery, sortCriterion, isAscending, pinnedElements]);

  return (
    <div className={styles.sidebar}>
    <div className={styles.topRow}>
    <input
        type="text"
        className={`${styles.inputButton} ${styles.searchInput}`}
        placeholder="Search by symbol..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
    <div className={styles.bottomRow}>
      <select
        className={styles.inputButton}
        value={sortCriterion}
        onChange={(e) => setSortCriterion(e.target.value)}
      >
          <option value="discovery">Sort by discovery</option>
          <option value="emoji">Sort by emoji</option>
          <option value="symbol">Sort by symbol</option>
          <option value="time">Sort by time</option>
          </select>
    <button
      className={styles.inputButton}
      onClick={() => setIsAscending(!isAscending)}
    >
      {isAscending ? 'Asc' : 'Desc'}
    </button>
  </div>
  <div className={styles.bottomRow}>
    <button
      className={`${styles.inputButton} ${styles.button}`}
      onClick={exportData}
    >
      Save
    </button>
    <label
      htmlFor="import-file"
      className={`${styles.inputButton} ${styles.fileInputLabel} ${styles.button}`}
    >
      Load
    </label>
    <input
      id="import-file"
      type="file"
      className={styles.fileInput}
      onChange={importData}
    />
  </div>
      <div className={styles.elementsWrapper}>
      {sortedElements.map((element, index) => {
        const isPinned = pinnedElements.has(element.symbol);
        let buttonClass = styles.elementButton;
        if (isPinned) {
          buttonClass += ` ${styles.pinnedElementButton}`;
        }
        if (element.discovery) {
          buttonClass += ` ${styles.elementButtonDiscovery}`;
        }

        return (
          <div key={index} title={getHoverText(element.symbol)} className={buttonClass} onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => handleElementPointerDown(e, element)}>
            <span className={styles.elementEmoji}>{element.emoji}</span>
            <span className={styles.elementText}>{element.symbol}</span>
          </div>
        );
      })}
      </div>
    </div>
  );
};

const starting_elements: Element[] = [
  { symbol: 'Earth', emoji: '🌍' , discovery: false },
  { symbol: 'Water', emoji: '💧', discovery: false },
  { symbol: 'Fire', emoji: '🔥', discovery: false },
  { symbol: 'Wind', emoji: '🌬️', discovery: false },
];

const HelpOverlay = () => {
  return (
    <div className={styles.helpContainer}>
      <div className={styles.helpButton}>?</div>
      <div className={styles.helpOverlay}>
        <ul>
          <li>🖱️+📄 Drag & drop symbols </li>
          <li>🫳📄➕📄 Drop on top to combine 🔗 </li>
          <li>🖱️➡️ Right click to split ✂️ </li>
          <li>🖱️⬆️ Middle click to duplicate 🔁 </li>
          <li>⌨️ Type to search 🔍 </li>
          <li>⎇ (Alt) + 🖱️ click sidebar to pin 📌 </li>
        </ul>
      </div>
    </div>
  );
};

var baseUrl = `http://localhost:8000/`;

async function fetchCombinedSymbol(symbols: string[]) {
  const encodedSymbols = symbols.map(symbol => encodeURIComponent(symbol)).join("&symbols=");

  const url = baseUrl + `add?symbols=${encodedSymbols}`;

  const response = await fetch(url, {credentials: 'omit'});

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }


  const json = await response.json();
  return json;
}

async function fetchSplitSymbol(symbol: string) {
  const encoded = encodeURIComponent(symbol)

  const url = baseUrl + `split?symbol=${encoded}`;

  const response = await fetch(url, {credentials: 'omit'});

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }


  const json = await response.json();
  return json;
}


const LandingRoute: React.FC = () => {
  const [selectedElement, setSelectedElement] = React.useState<Element | null>(null);
  const [elements, setElements] = React.useState<Element[]>(() => {
    const savedElements = localStorage.getItem('elements');
    return savedElements ? JSON.parse(savedElements) : starting_elements;
  });
  const [symbolCombos, setSymbolCombos] = React.useState<{ [key: string]: Element }>(() => {
    const savedCombos = localStorage.getItem('symbolCombos');
    return savedCombos ? JSON.parse(savedCombos) : {};
  });
  const [inverseSymbolCombos, setInverseSymbolCombos] = React.useState<{ [key: string]: Element[] }>(() => {
    const savedCombos = localStorage.getItem('inverseSymbolCombos');
    return savedCombos ? JSON.parse(savedCombos) : {};
  });
  const [plopIdx, setPlopIdx] = React.useState<number>(0);

  let plops = [first_plop, second_plop, third_plop, fourth_plop].map((plop: string) => new Audio(plop))
  let discovery = new Audio(discovery_sound)
  let error_element = new Audio(error_sound)
  let new_element = new Audio(new_sound)

  const playPlop = () => {
    let plop = plops[plopIdx]
    plop.play()
    setPlopIdx(currentIdx => (currentIdx + 1) % plops.length)
  }

  const selectAndPlop = (element: Element) => {
    playPlop()
    return setSelectedElement(element)
  }

  React.useEffect(() => {
    // Function to handle the context menu
    const handleRightClick = (event: MouseEvent) => {
      event.preventDefault();
    };

    // Attach the event listener to disable the context menu
    document.addEventListener('contextmenu', handleRightClick);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener('contextmenu', handleRightClick);
    };
  }, []);

  React.useEffect(() => {
    localStorage.setItem('elements', JSON.stringify(elements));
  }, [elements]);

  React.useEffect(() => {
    localStorage.setItem('symbolCombos', JSON.stringify(symbolCombos));
  }, [symbolCombos]);

  React.useEffect(() => {
    localStorage.setItem('inverseSymbolCombos', JSON.stringify(inverseSymbolCombos));
  }, [symbolCombos]);



  const combineElement = async (symbol1: string, symbol2: string, callback: (element: Element) => void) => {
    const symbols = [symbol1, symbol2]
    symbols.sort();
    const symbolKey = symbols.join("+++");

    const existingElement = symbolCombos[symbolKey];

    if (existingElement) {
      if (existingElement.symbol == ""){
        error_element.play()
      } else {
        playPlop()
      }

      callback(existingElement);
      return;
    }

    try {
      const newElement = await fetchCombinedSymbol(symbols) as Element;

      setElements(currentElements => {
        const isElementUnique = !currentElements.some(element => element.symbol === newElement.symbol);

        if(newElement.discovery && isElementUnique){
          discovery.play()
        } else {
          if (isElementUnique) {
            new_element.play()
          } else {
            playPlop()
          }
        }

        if (isElementUnique) {
          return [...currentElements, newElement];
        } else {
          return currentElements;
        }
      });

      setSymbolCombos(currentCombos => ({
        ...currentCombos,
        [symbolKey]: newElement,
      }));

      callback(newElement);
    } catch (error) {
      console.error("Error calling on_combine_request:", error);
      error_element.play()

      const badElement = {symbol: "", emoji: "", discovery: false}

      setSymbolCombos(currentCombos => ({
        ...currentCombos,
        [symbolKey]: badElement,
      }));

      callback(badElement);
    }
  };

  const splitElement = async (symbol: string, callback: (elements: Element[]) => void) => {
    // Use the symbol directly as a key since we are splitting a single symbol
    const existingElements = inverseSymbolCombos[symbol];
  
    if (existingElements) {
      if (existingElements.some(element => element.symbol === "")) {
        error_element.play();
      } else {
        playPlop();
      }
  
      callback(existingElements);
      return;
    }
  
    try {
      const newElements = await fetchSplitSymbol(symbol) as Element[];

      setElements(currentElements => {
        const updatedElements = [...currentElements];
  
        newElements.forEach(newElement => {
          const isElementUnique = !currentElements.some(element => element.symbol === newElement.symbol);
  
          if (newElement.discovery && isElementUnique) {
            discovery.play();
          } else {
            if (isElementUnique) {
              new_element.play();
            } else {
              playPlop();
            }
          }
  
          if (isElementUnique) {
            updatedElements.push(newElement);
          }
        });
  
        return updatedElements;
      });
  
      setInverseSymbolCombos(currentCombos => ({
        ...currentCombos,
        [symbol]: newElements,
      }));
  
      callback(newElements);
    } catch (error) {
      console.error("Error calling on_split_request:", error);
      error_element.play();
  
      const badElements = [{ symbol: "", emoji: "", discovery: false }, { symbol: "", emoji: "", discovery: false }];
  
      setInverseSymbolCombos(currentCombos => ({
        ...currentCombos,
        [symbol]: badElements,
      }));
  
      callback(badElements);
    }
  };

  React.useEffect(() => {
    if (selectedElement !== null){
      const handleMouseUp = () => {
        setSelectedElement(null);
      };

      window.addEventListener('mouseup', handleMouseUp);

      // Cleanup the event listener when the component unmounts
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [selectedElement]);

  return (
    <div className="app-container">
      <HelpOverlay/>
      <div className={styles.canvasContainer}>
        <ReactP5Wrapper sketch={sketch} selectedElement={selectedElement} onElementClick={setSelectedElement} combineElement={combineElement} splitElement={splitElement} symbolCombos={symbolCombos} playPlop={playPlop}/>
      </div>
      <div className={styles.sidebarLinks}>
        <a href="https://neal.fun/infinite-craft/" className={styles.linkButton} target="_blank" rel="noopener noreferrer">
          📜 Neal.Fun
        </a>
        <a href="https://ko-fi.com/robchad" className={styles.linkButton} target="_blank" rel="noopener noreferrer">
          ☕ Donate
        </a>
        <Sidebar
          elements={elements}
          setElements={setElements}
          symbolCombos={symbolCombos}
          setSymbolCombos={setSymbolCombos}
          inverseSymbolCombos={inverseSymbolCombos}
          setInverseSymbolCombos={setInverseSymbolCombos}
          onElementClick={selectAndPlop}
        />
      </div>
    </div>
  );
};

export default LandingRoute;
