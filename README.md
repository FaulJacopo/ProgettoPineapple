
# Web Interface for HAK5 Wi-Fi Pineapple MK7

Questo applicativo è stato creato per permettere una personalizzazione della cautica interfaccia grafica presente di default sul dispositivo di HAK5.com "Wi-Fi Pineapple MK7".

Per quanto riguarda le funzionalità sono pressochè le medesime dell'interfaccia di default. Questa guida è però pensata per aiutare in una situazione.

## Installazione

L'applicativo è disponibile all'interno del repository Github, per cui ci basterà clonare il repository all'interno di una cartella locale.

```bash
git clone https://github.com/FaulJacopo/ProgettoPineapple
cd ProgettoPineapple
```

Succesivamente dovremo creare il nostro virtual environment.

```bash
python -m venv .venv
.\.venv\Scripts\activate.bat
pip install -r requirements.txt
```

Avvio dell'interfaccia:

```bash
python pineapple-api.py
```

## Sniffing della Password

Per lo sniffing della password abbiamo la possibilità di ricavare l'handshake che il dispositivo fa con l'Access Point con all'interno anche la password salvata ed usata per la connessione ad esso.

Nel caso avessimo un file `.pcap` dovremmo convertirlo in un file `.22000`. Per fare ciò dobbiamo andare sul sito internet: `https://hashcat.net/cap2hashcat/`.

Una volta convertito il file in uno con estensione `.22000` possiamo utilizzare il tool chiamato "Hashcat" per crackare la password ed accedere così al dispositivo coinvolto nell'Handshake.

> [!INFO]
> COMANDO DA ESEGUIRE SU KALI LINUX oppure SU DI UN AMBIENTE CON HASHCAT e IL VOCABOLARIO ROCKYOU.
> È POSSIBILE UTILIZZARE ANCHE UN ALTRO FILE VOCABOLARIO A VOSTRA SCELTA.

```bash
hashcat -m 22000 -a 0 79344_1789732809.hc22000 /usr/share/wordlists/rockyou.txt --show
```