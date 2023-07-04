const ws = new WebSocket("ws://" + location.host);
document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const oponentGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay2 = document.querySelector('#info2')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')
  const userSquares = []
  const oponentSquares = []
  let isHorizontal = true
  let isGameOver = false
  let podeWO = true
  let jogadorAtual = 'user'
  const tamanho = 10
  let playerNum = 0
  let partidaUUID = ''
  let pronto = false
  let oponentePronto = false
  let todosNaviosPosicionados = false
  let tiroRealizado = -1
  let playersConectados = false

  criarTabuleiro(userGrid, userSquares)
  criarTabuleiro(oponentGrid, oponentSquares)

  iniciarJogo()

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  function iniciarJogo() {
    infoDisplay2.innerHTML = "esperando outro jogador..."
    ws.addEventListener("message", ({ data }) => {
      const packet = JSON.parse(data);

      if (packet.type == "numero-jogador") {
        if (packet.data === -1) {
          infoDisplay.innerHTML = "Desculpe, aconteceu algo de errado."
        } else {
          playerNum = parseInt(packet.data)
          partidaUUID = packet.PID
          if (playerNum === 1) jogadorAtual = "enemy"

          console.log("Seu playerNum: ", playerNum)

          // Pegar o status do outro jogador
          ws.send(JSON.stringify({
            type: 'checar-jogadores',
            data: '',
            PID: partidaUUID,
          }))
        }
      }
      if (partidaUUID == packet.PID) {
        console.log("switch-app")
        switch (packet.type) {
          // Outro jogador se conectou ou se desconectou
          case "conexao-jogador":
            console.log(`Jogador numero ${packet.data} se conectou ou se desconectou`)
            jogadorConectouOuDisconectou(packet.data)
            break;
          // Quando o oponente esta pronto
          case "oponente-pronto":
            oponentePronto = true
            jogadorPronto(packet.data)
            if (pronto) {
              comecarPartida(ws)
              setupButtons.style.display = 'none'
            }
            break;
          // Checar os status dos jogadores
          case "checar-jogadores":
            packet.data.forEach((p, i) => {
              if (p.connected) jogadorConectouOuDisconectou(i)
              if (p.ready) {
                jogadorPronto(i)
                if (i !== jogadorPronto) oponentePronto = true
              }
            })
            break;
          case "timeout":
            infoDisplay.innerHTML = 'Você atingiu o timeout de 10 minutos'
            break;
          case "tiro":
            vezOponente(packet.data)
            const square = userSquares[packet.data]
            ws.send(JSON.stringify({
              type: 'resposta-tiro',
              data: square.classList,
              PID: partidaUUID,
            }))
            comecarPartida(ws)
            break;
          case "resposta-tiro":
            revelarQuadrado(packet.data)
            comecarPartida(ws)
            break;
          case "vitoria-wo":
            if(isGameOver==false && podeWO==true){wo()}
            break;
        }
      }
    });

    // Clique no botão de iniciar
    startButton.addEventListener('click', checarBotaoStart)

    function checarBotaoStart() {
      if (todosNaviosPosicionados && playersConectados) { comecarPartida(ws); infoDisplay.innerHTML = "Jogadores conectados, Embarcações ok!" }
      else if (playersConectados == false && playerNum == 0) { infoDisplay.innerHTML = "Esperando outro jogador conectar..." }
      else { infoDisplay.innerHTML = "Por favor colocar as embarcaçoes!" }
    }

    // Configure event listeners para detectar tiros
    oponentSquares.forEach(square => {
      square.addEventListener('click', () => {
        if (jogadorAtual === 'user' && pronto && oponentePronto) {
          tiroRealizado = square.dataset.id
          ws.send(JSON.stringify({
            type: 'tiro',
            data: tiroRealizado,
            PID: partidaUUID,
          }))
        }
      })
    })

    function jogadorConectouOuDisconectou(num) {
      console.log("playerConnectDisconnectFunction: ", num);
      if (parseInt(num) == 1) { playersConectados = true;}
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if(document.querySelector('.p2 .connected').classList.contains('active')){
        infoDisplay2.innerHTML = "oponente conectado!"
      }

      if (parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  //Criar Tabuleiro
  function criarTabuleiro(grid, squares) {
    for (let i = 0; i < tamanho * tamanho; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  //Rotacionar os navios
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      return
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  //Mover o navio do usuario (arrastar)
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
  }))

  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
  }

  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
    const notAllowedHorizontal = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 2, 22, 32, 42, 52, 62, 72, 82, 92, 3, 13, 23, 33, 43, 53, 63, 73, 83, 93]
    const notAllowedVertical = [99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60]

    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

    shipLastId = shipLastId - selectedShipIndex

    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i = 0; i < draggedShipLength; i++) {
        console.log(i)
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + i] == undefined) { console.log("undefined!!!Horizontal"); return; }
      }
      for(let i = 0; i < draggedShipLength; i++){
        if(userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.contains('taken')) {return}
      }
      for (let i = 0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }

      //Verifica se o navio está dentro da grid, se não estiver o navio voltará para a posição original
    } else if (!isHorizontal && !newNotAllowedVertical.includes(selectedShipIndex)) {
      for (let i = 0; i < draggedShipLength; i++) {
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex*10 + tamanho * i] == undefined) { console.log("undefined!!!Vertical"); return; }
      }
      for(let i = 0; i < draggedShipLength; i++){
        if(userSquares[parseInt(this.dataset.id) - selectedShipIndex*10 + tamanho * i].classList.contains('taken')) {return}
      }                         
      for (let i = 0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        console.log("draggedShiplength", draggedShipLength)
        console.log("directionClass:", directionClass)
        console.log("parseInt:", parseInt(this.dataset.id))
        console.log("selectedShip:", selectedShipIndex)
        console.log("classlist:", userSquares[parseInt(this.dataset.id) - selectedShipIndex*10 + tamanho * i])
        userSquares[parseInt(this.dataset.id) - selectedShipIndex*10 + tamanho * i].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip)
    if (!displayGrid.querySelector('.ship')) todosNaviosPosicionados = true
  }

  function dragEnd() {
  }

  // Trata de começar a partida
  function comecarPartida(socket) {
    setupButtons.style.display = 'none'
    if (isGameOver) return
    if (!pronto) {
      socket.send(JSON.stringify({
        type: 'jogador-pronto',
        data: true,
        PID: partidaUUID,
      }))
      pronto = true
      jogadorPronto(playerNum)
    }

    if (oponentePronto) {
      if (jogadorAtual === 'user') {
        turnDisplay.innerHTML = "Sua vez"
      }
      if (jogadorAtual === 'enemy') {
        turnDisplay.innerHTML = "Vez do oponente"
      }
    }
  }

  function jogadorPronto(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  function revelarQuadrado(classList) {
    const enemySquare = oponentGrid.querySelector(`div[data-id='${tiroRealizado}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('acertou') && jogadorAtual === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) ++destroyerCount
      if (obj.includes('submarine')) ++submarineCount
      if (obj.includes('cruiser')) ++cruiserCount
      if (obj.includes('battleship')) ++battleshipCount
      if (obj.includes('carrier')) ++carrierCount
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('acertou')
      jogadorAtual = 'user'
    } else {
      enemySquare.classList.add('errou')
      jogadorAtual = 'enemy'
    }
    checarPorVitorias()
    //jogadorAtual = 'enemy'
  }

  let oponentDestroyerCount = 0
  let oponentSubmarineCount = 0
  let oponentCruiserCount = 0
  let oponentBattleshipCount = 0
  let oponentCarrierCount = 0

  function vezOponente(square) {
    if (!userSquares[square].classList.contains('acertou')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'acertou' : 'errou')
      if (userSquares[square].classList.contains('destroyer')) ++oponentDestroyerCount
      if (userSquares[square].classList.contains('submarine')) ++oponentSubmarineCount
      if (userSquares[square].classList.contains('cruiser')) ++oponentCruiserCount
      if (userSquares[square].classList.contains('battleship')) ++oponentBattleshipCount
      if (userSquares[square].classList.contains('carrier')) ++oponentCarrierCount
      checarPorVitorias()
    }
    const hit = userSquares[square].classList.contains('taken')
    if(!hit){jogadorAtual = 'user'}
    turnDisplay.innerHTML = 'Your Go'
  }

  function checarPorVitorias() {
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `Você afundou o destroyer do oponente`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `Você afundou o submarino do oponente`
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `Você afundou o crusador do oponente`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `Você afundou o navio de batalha do oponente`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `Você afundou o porta-aviões do oponente`
      carrierCount = 10
    }
    if (oponentDestroyerCount === 2) {
      infoDisplay.innerHTML = `O oponente afundou seu destroyer`
      oponentDestroyerCount = 10
    }
    if (oponentSubmarineCount === 3) {
      infoDisplay.innerHTML = `O oponente afundou seu submarino`
      oponentSubmarineCount = 10
    }
    if (oponentCruiserCount === 3) {
      infoDisplay.innerHTML = `O oponente afundou seu crusador`
      oponentCruiserCount = 10
    }
    if (oponentBattleshipCount === 4) {
      infoDisplay.innerHTML = `O oponente afundou seu navio de batalha`
      oponentBattleshipCount = 10
    }
    if (oponentCarrierCount === 5) {
      infoDisplay.innerHTML = `O oponente afundou seu porta-aviões`
      oponentCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "Você venceu! (Atualize a página para jogar novamente)"
      gameOver()
    }
    if ((oponentDestroyerCount + oponentSubmarineCount + oponentCruiserCount + oponentBattleshipCount + oponentCarrierCount) === 50) {
      infoDisplay.innerHTML = `Você perdeu, mais sorte na próxima (Atualize a página para jogar novamente)`
      podeWO = false
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    finalizarPartida()
  }

  function finalizarPartida() {
    ws.send(JSON.stringify({
      type: 'finalize-partida',
      PID: partidaUUID,
    }))
  }

  function wo() {
    console.log("WO")
    infoDisplay.innerHTML = "Você venceu por W.O. (Atualize a página para jogar novamente)"
    infoDisplay2.innerHTML = "o outro jogador saiu.."
    setupButtons.style.display = 'none'
    gameOver()
  }
})
