import { useEffect, useId, useRef, useState } from "react";

function CompactSelect({ options, value, onChange, placeholder, ariaLabel }) {
  const menuOptions = [{ value: "", label: placeholder }, ...options];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState("below");
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();
  const selectedIndex = menuOptions.findIndex((option) => option.value === value);
  const selectedOption = menuOptions[selectedIndex];

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  const openMenu = (index) => {
    const bounds = triggerRef.current?.getBoundingClientRect();
    const menuHeight = Math.min(menuOptions.length * 33, 220);
    const shouldOpenAbove =
      bounds &&
      bounds.bottom + menuHeight > window.innerHeight &&
      bounds.top > menuHeight;

    setPlacement(shouldOpenAbove ? "above" : "below");
    setActiveIndex(index);
    setIsOpen(true);
  };

  const selectOption = (option) => {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!isOpen) {
        openMenu(
          selectedIndex >= 0
            ? selectedIndex
            : direction > 0
              ? 0
              : menuOptions.length - 1
        );
      } else {
        setActiveIndex(
          (index) =>
            (index + direction + menuOptions.length) % menuOptions.length
        );
      }
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openMenu(selectedIndex >= 0 ? selectedIndex : 0);
      } else {
        selectOption(menuOptions[activeIndex]);
      }
      return;
    }

    if (isOpen && event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (isOpen && event.key === "End") {
      event.preventDefault();
      setActiveIndex(menuOptions.length - 1);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const matchIndex = menuOptions.findIndex((option) =>
        option.label.toLowerCase().startsWith(event.key.toLowerCase())
      );
      if (matchIndex >= 0) {
        openMenu(matchIndex);
      }
    }
  };

  return (
    <div
      className={`compact-select${isOpen ? " compact-select--open" : ""}`}
      ref={containerRef}
    >
      <button
        aria-activedescendant={
          isOpen ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="compact-select__trigger"
        onClick={() =>
          isOpen
            ? setIsOpen(false)
            : openMenu(selectedIndex >= 0 ? selectedIndex : 0)
        }
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span
          className={
            selectedIndex === 0 ? "compact-select__placeholder" : ""
          }
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <span aria-hidden="true" className="compact-select__arrow" />
      </button>
      {isOpen && (
        <div
          className={`compact-select__menu compact-select__menu--${placement}`}
          id={listboxId}
          role="listbox"
        >
          {menuOptions.map((option, index) => (
            <div
              aria-selected={option.value === value}
              className={`compact-select__option${
                index === activeIndex ? " compact-select__option--active" : ""
              }`}
              id={`${listboxId}-option-${index}`}
              key={option.value}
              onClick={() => selectOption(option)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompactSelect;
