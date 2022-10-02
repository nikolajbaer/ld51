import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';
import { SelectionHelper } from './SelectionHelper.js';

export function configure_selections(camera, scene, renderer, onSelect, onDeselect) {
  const BUTTON = 2 // RMB
  const selectionBox = new SelectionBox(camera, scene);
  const boxElement = document.getElementById('selectbox')
  const startPoint = {x:0,y:0}
  let isDown = false

  document.addEventListener('pointerdown', function (event) {
    if(event.button != BUTTON){ return }
    for (const item of selectionBox.collection) {
      if(item.selectable){ onDeselect(item) }
    }

    //target box
    boxElement.style.left = `${event.clientX}px`
    boxElement.style.top = `${event.clientX}px`
    boxElement.style.width = "0px"
    boxElement.style.height = "0px"
    boxElement.style.display = 'block'
    startPoint.x = event.clientX 
    startPoint.y = event.clientY
    isDown = true

    selectionBox.startPoint.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      - (event.clientY / window.innerHeight) * 2 + 1,
      0.5);
    event.preventDefault()
  });

  document.addEventListener('pointermove', function (event) {
    /*if(event.button != BUTTON){ return }*/
    if(isDown){
      boxElement.style.left = Math.min(event.clientX,startPoint.x) +"px"
      boxElement.style.right = Math.max(event.clientX,startPoint.x)+"px"
      boxElement.style.top = Math.min(event.clientY,startPoint.y) +"px"
      boxElement.style.bottom = Math.max(event.clientY,startPoint.y) +"px"
      boxElement.style.width = Math.abs(event.clientX - startPoint.x) +"px"
      boxElement.style.height = Math.abs(event.clientY - startPoint.y) +"px"
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
    boxElement.style.display = 'none'
    isDown = false
    event.preventDefault()
  });

  document.getElementsByTagName('canvas')[0].addEventListener("contextmenu", function (e){
    e.preventDefault();
  }, false);

}