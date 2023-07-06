const ws = new WebSocket("ws://" + location.host);
document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const oponentGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const submarino = document.querySelector('.submarino-container')
  const contratorpedeiros = document.querySelector('.contra-torpedeiros-container')
  const navio_tanque = document.querySelector('.navio-tanque-container')
  const porta_avioes = document.querySelector('.porta-avioes-container')
  const startButton = document.querySelector('#start')
  const caixachat = document.querySelector('#chat')
  const turnDisplay = document.querySelector('#whose-go')
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

  let submarinoCount = 0
  let contratorpedeirosCount = 0
  let navio_tanqueCount = 0
  let porta_avioesCount = 0

  function iniciarJogo() {
    chat("esperando outro jogador...")
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
          case "resposta-chat":
            chat(packet.data, packet.cor)
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
          chat("oponente conectado!")
          chat("aperte R para rotacionar!")
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

  document.addEventListener

    //Rotacionar os navios
  document.addEventListener('keypress', event => {
    if (event.key == 'r' || event.key == 'R') {
      
      if (isHorizontal) {
        submarino.classList.toggle('submarino-container-vertical')
        contratorpedeiros.classList.toggle('contra-torpedeiros-container-vertical')
        navio_tanque.classList.toggle('navio-tanque-container-vertical')
        porta_avioes.classList.toggle('porta-avioes-container-vertical')
        isHorizontal = false
        return
      }
      if (!isHorizontal) {
        submarino.classList.toggle('submarino-container-vertical')
        contratorpedeiros.classList.toggle('contra-torpedeiros-container-vertical')
        navio_tanque.classList.toggle('navio-tanque-container-vertical')
        porta_avioes.classList.toggle('porta-avioes-container-vertical')
        isHorizontal = true
        return
      }
    }
  })

  function chat(texto, cor=-1) {
       let item = document.createElement('option')
       item.text = texto
       switch (cor) {
        case -1:
          item.style.color = 'black'
          break;
        case 0:
          item.style.color = 'blue'
          break;
        case 1:
          item.style.color = 'red'
          break;
       }
       caixachat.appendChild(item)
       caixachat.scrollTop = caixachat.scrollHeight;
  }

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
      if (obj.includes('submarino')) ++submarinoCount
      if (obj.includes('contra-torpedeiros')) ++contratorpedeirosCount
      if (obj.includes('navio-tanque')) ++navio_tanqueCount
      if (obj.includes('porta_avioes')) ++porta_avioesCount
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

  let oponentSubmarinoCount = 0
  let oponentContratorpedeirosCount = 0
  let oponentNavio_tanqueCount = 0
  let oponentPorta_avioesCount = 0

  function vezOponente(square) {
    if (!userSquares[square].classList.contains('acertou')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'acertou' : 'errou')
      if (userSquares[square].classList.contains('submarino')) ++oponentSubmarinoCount
      if (userSquares[square].classList.contains('contra-torpedeiros')) ++oponentContratorpedeirosCount
      if (userSquares[square].classList.contains('navio-tanque')) ++oponentNavio_tanqueCount
      if (userSquares[square].classList.contains('porta-avioes')) ++oponentPorta_avioesCount
      checarPorVitorias()
    }
    const hit = userSquares[square].classList.contains('taken')
    if(!hit){jogadorAtual = 'user'}
    turnDisplay.innerHTML = 'Your Go'
  }

  function checarPorVitorias() {
    if (submarinoCount === 2) {
      infoDisplay.innerHTML = `Você afundou o submarino do oponente`
      submarinoCount = 10
    }
    if (contratorpedeirosCount === 3) {
      infoDisplay.innerHTML = `Você afundou o contra-torpedeiro do oponente`
      contratorpedeirosCount = 10
    }
    if (navio_tanqueCount === 4) {
      infoDisplay.innerHTML = `Você afundou o navio-tanque do oponente`
      navio_tanqueCount = 10
    }
    if (porta_avioesCount === 5) {
      infoDisplay.innerHTML = `Você afundou o porta-aviões do oponente`
      porta_avioesCount = 10
    }
    if (oponentSubmarinoCount === 2) {
      infoDisplay.innerHTML = `O oponente afundou seu submarino`
      oponentSubmarinoCount = 10
    }
    if (oponentContratorpedeirosCount === 3) {
      infoDisplay.innerHTML = `O oponente afundou seu contra-torpedeiros`
      oponentContratorpedeirosCount = 10
    }
    if (oponentNavio_tanqueCount === 4) {
      infoDisplay.innerHTML = `O oponente afundou seu navio-tanque`
      oponentNavio_tanqueCount = 10
    }
    if (oponentPorta_avioesCount === 5) {
      infoDisplay.innerHTML = `O oponente afundou seu porta-aviões`
      oponentPorta_avioesCount = 10
    }

    if ((submarinoCount + contratorpedeirosCount + navio_tanqueCount + porta_avioesCount) === 40) {
      infoDisplay.innerHTML = `Você venceu!`
      gameOver()
    }
    if ((oponentSubmarinoCount + oponentContratorpedeirosCount + oponentNavio_tanqueCount + oponentPorta_avioesCount) === 40) {
      infoDisplay.innerHTML = `Você perdeu, mais sorte na próxima`
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
    infoDisplay.innerHTML = "Você venceu por W.O."
    chat("o outro jogador saiu..")
    setupButtons.style.display = 'none'
    gameOver()
  }
})
