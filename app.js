document.addEventListener('DOMContentLoaded', function() {
  let display = document.getElementById('tela');
  let buttons = Array.from(document.getElementsByClassName('button'));

  function handleInput(value) {
    switch(value) {
      case '=':
        try {
          display.innerText = eval(display.innerText.replace('X', '*'));
        } catch {
          display.innerText = 'Erro';
        }
        break;
      case 'ESC':
        display.innerText = '';
        break;
      case 'Backspace':
        display.innerText = display.innerText.slice(0, -1);
        break;
      default:
        display.innerText += value;
    }
  }

  // Handle button clicks
  buttons.map(button => {
    button.addEventListener('click', (e) => {
      handleInput(e.target.innerText);
    });
  });

  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (/[0-9]/.test(key) || ['+', '-', '*', '/', 'Enter', 'Escape', 'Backspace'].includes(key)) {
      e.preventDefault();
      if (key === 'Enter') {
        handleInput('=');
      } else if (key === 'Escape') {
        handleInput('ESC');
      } else {
        handleInput(key);
      }
    }
  });
});
