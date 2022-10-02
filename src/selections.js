import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';
import { SelectionHelper } from 'three/examples/jsm/interactive/SelectionHelper.js';

export function configure_selections(camera, scene, renderer, onSelect, onDeselect) {
  const BUTTON = 2 // RMB
  const selectionBox = new SelectionBox(camera, scene);
  const helper = new SelectionHelper(renderer, 'selectBox');

  document.addEventListener('pointerdown', function (event) {
    if(event.button != BUTTON){ return }
    helper.BUTTON 
    for (const item of selectionBox.collection) {
      if(item.selectable){ onDeselect(item) }
    }
    selectionBox.startPoint.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      - (event.clientY / window.innerHeight) * 2 + 1,
      0.5);
    event.preventDefault()
  });

  document.addEventListener('pointermove', function (event) {
    if(event.button != BUTTON){ return }
    if (helper.isDown) {
      for (let i = 0; i < selectionBox.collection.length; i++) {
        if(selectionBox.collection[i].selectable){ onDeselect(selectionBox.collection[i]) }
      }
      selectionBox.endPoint.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1,
        0.5);
      const allSelected = selectionBox.select();
      for (let i = 0; i < allSelected.length; i++) {
        if(allSelected[i].selectable){ onSelect(allSelected[i]) }
      }
    }
  });

  document.addEventListener('pointerup', function (event) {
    if(event.button != BUTTON){ return }
    selectionBox.endPoint.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      - (event.clientY / window.innerHeight) * 2 + 1,
      0.5);
    const allSelected = selectionBox.select();
    for (let i = 0; i < allSelected.length; i++) {
      if(allSelected[i].selectable){ onSelect(allSelected[i]) }
    }
    event.preventDefault()
  });

  document.getElementsByTagName('canvas')[0].addEventListener("contextmenu", function (e){
    e.preventDefault();
  }, false);

}