const express = require('express')
const WebSocket = require('ws');
const uuid = require('uuid');
const path = require('path')
const PORT = process.env.PORT || 5000
const app = express()

// Definir pasta static
app.use(express.static(path.join(__dirname, "public")))

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`App Express is running!, port: ${PORT}`);
})

const wss = new WebSocket.Server({ server })

let partidas = {}
const clients = []
var partidasID = uuid.v4()
var size = Object.keys(partidas).length;

wss.on('connection', socket => {
  let playerIndex = -1;
  const jogador = [socket, null]
  clients.push(jogador);
  const index = clients.indexOf(jogador);
  playerIndex = index;

  // Informar para o jogador que se conectou qual o seu numero
  socket.send(JSON.stringify({
    type: 'numero-jogador',
    data: playerIndex,
    PID: partidasID,
  }))

  console.log(`Jogador ${playerIndex} conectou!`)

  if (playerIndex === -1) {
    console.log("Falha ao conectar jogador")
    return
  }

  clients[playerIndex][1] = false
  console.log('Indice do jogador:' + playerIndex)
  clients.forEach(e => {
    console.log(['ws', e[1]])
  });

  // Informar para o outro jogador qual o numero do jogador que acabou de conectar
  wss.clients.forEach(function each(client) {
    if (client !== socket && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'conexao-jogador',
        data: playerIndex,
        PID: partidasID,
      }))
    }
  });
  console.log("vetor clientes", clients.length)
  const pp = partidasID;
  if (clients.length >= 2) {
    partidas[partidasID] = {
      jogador1: clients[0],
      jogador2: clients[1]
    }
    clients.splice(0, 2);
    partidasID = uuid.v4();
    size = Object.keys(partidas).length;
    console.log("Quantidade de partidas: ", size)
  }

  // Tratar desconexão
  socket.on('close', () => {
    if (partidas[pp] !== undefined) {
      wss.clients.forEach(function each(client) {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
        console.log("enviou wo!")
          client.send(JSON.stringify({
            type: 'vitoria-wo',
            PID: pp,
          }))
        }
      });
      delete partidas[pp];
    }
    else {
      const index = clients.indexOf(jogador);
      if (index > -1) {
        clients.splice(index, 1);
      }
    }

    console.log(`Jogador ${playerIndex} disconectou`)

    wss.clients.forEach(function each(client) {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'conexao-jogador',
          data: playerIndex,
          PID: pp,
        }))
      }
    });

    console.log('Indice do jogador:' + playerIndex)
    clients.forEach(e => {
      console.log(['ws', e[1]])
    });
  })

  // Tratar mensagens do cliente
  socket.on("message", (data) => {
    let t = false
    const packet = JSON.parse(data);
    let cli = []
    size = Object.keys(partidas).length;
    if (clients.length == 1) { size = 0 }
    if (partidas[packet.PID] !== undefined && size > 0) {
      console.log("enviado pro jogador de PID:", packet.PID)
      cli = [partidas[packet.PID].jogador1, partidas[packet.PID].jogador2]
      console.log(cli[0][1], cli[1][1])
      t = true
    }

    if (cli.length < 1) {
      cli[0] = clients[0]
    }
    if (packet.type == "checar-jogadores") {
      const players = []
      for (const i in cli) {
        console.log("vetor cli", cli[i][1])
        cli[i][1] === null ? players.push({ connected: false, ready: false }) : players.push({ connected: true, ready: cli[i][1] })
      }

      socket.send(JSON.stringify({
        type: 'checar-jogadores',
        data: players,
        PID: packet.PID,
      }))
    }

    if(packet.type == "finalize-partida"){
          socket.close()
    }

    size = Object.keys(partidas).length;
    if (size > 0 && t == true) {
      t = false;

      switch (packet.type) {
        case "jogador-pronto":
          wss.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'oponente-pronto',
                data: playerIndex,
                PID: packet.PID,
              }))
            }
          });
          cli[playerIndex][1] = true
          break;
        case "tiro":
          id = packet.data;
          console.log(`Tiro realizado por ${playerIndex}`, id)

          // Envie o movimento para o outro jogador
          wss.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'tiro',
                data: id,
                PID: packet.PID,
              }))
            }
          });
          break;
        case "resposta-tiro":
          square = packet.data;

          // Encaminhe a resposta para o outro jogador
          wss.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'resposta-tiro',
                data: square,
                PID: packet.PID,
              }))
            }
          });
          break;
        case "chat":
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'resposta-chat',
                data: packet.data,
                PID: packet.PID,
                cor: packet.cor,
              }))
            }
          });
          break;
      }
    }
  });

  // Tratar timeout
  setTimeout(() => {
    socket.send(JSON.stringify({
      type: 'timeout',
      data: playerIndex,
    }))
    socket.close()
  }, 300000) // limite de 5 minutos por jogador
})