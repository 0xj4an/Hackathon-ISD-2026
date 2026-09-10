#!/usr/bin/env python3
"""Genera los documentos sinteticos que prueban el OCR.

Por que imagenes y no texto: pasarle texto plano perfecto al modelo no prueba
nada. El telefono va a recibir una foto tomada a pulso, torcida, con sombra y
compresion JPEG. Si la extraccion solo funciona sobre texto limpio, en la demo
se cae. Cada documento sale en dos versiones, `nitido` y `dificil`, para tener
el rango completo entre "foto buena" y "foto de verdad".

Por que Python y no .mjs como el resto de generadores: Pillow ya esta en la
maquina y renderiza texto con control fino; el equivalente en Node pide una
dependencia nativa que hay que compilar. Las imagenes quedan commiteadas, asi
que esto corre una vez y no vuelve a hacer falta.

TODOS LOS DATOS SON FICTICIOS. Las personas, empresas y bancos no existen, y
cada documento lo dice en su cara. No se reproduce el diseno, el escudo ni los
sellos de ningun documento oficial: la idea es ejercitar el OCR, no falsificar
nada.

Uso:  python3 data/generar-documentos.py
Sale: data/documentos/*.jpg y data/documentos/esperado.json
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SEMILLA = 20260911
RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "documentos"

F = "/System/Library/Fonts/Supplemental/"
FUENTES = {
    "sans": F + "Arial.ttf",
    "sans_bold": F + "Arial Bold.ttf",
    "mono": F + "Courier New.ttf",
    "mono_bold": F + "Courier New Bold.ttf",
    "serif": F + "Times New Roman.ttf",
}
AVISO = "MUESTRA SIN VALOR - DATOS FICTICIOS - PRUEBA DE OCR"

TINTA = (28, 30, 34)
TENUE = (105, 110, 118)


def fuente(nombre, tam):
    return ImageFont.truetype(FUENTES[nombre], tam)


def texto(d, xy, s, f, color=TINTA):
    d.text(xy, s, font=f, fill=color)


# --------------------------------------------------------------- documentos

def cedula():
    """Formato tarjeta, 1012x638 (ID-1 a 300 dpi)."""
    img = Image.new("RGB", (1012, 638), (247, 246, 242))
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 1011, 92], fill=(214, 219, 226))
    texto(d, (36, 24), "CEDULA DE IDENTIDAD PERSONAL", fuente("sans_bold", 34))
    texto(d, (36, 62), AVISO, fuente("sans", 15), TENUE)

    # Marco de la foto. Vacio a proposito: no hay cara de nadie aqui.
    d.rectangle([36, 128, 268, 430], outline=(150, 155, 162), width=3)
    texto(d, (86, 268), "SIN FOTO", fuente("sans", 22), (170, 174, 180))

    campos = [
        ("NOMBRE", "MARIELA DEL CARMEN"),
        ("APELLIDOS", "QUIROS BATISTA"),
        ("FECHA DE NACIMIENTO", "14-MAR-1979"),
        ("LUGAR DE NACIMIENTO", "SONA, VERAGUAS"),
        ("SEXO", "F"),
        ("EXPEDIDA", "30-NOV-2019"),
        ("EXPIRA", "30-NOV-2029"),
    ]
    y = 132
    for k, v in campos:
        texto(d, (306, y), k, fuente("sans", 17), TENUE)
        texto(d, (306, y + 22), v, fuente("sans_bold", 27))
        y += 62

    d.rectangle([306, 556, 700, 604], outline=(150, 155, 162), width=2)
    texto(d, (318, 566), "8-912-2044", fuente("mono_bold", 36))
    texto(d, (720, 570), "IDPAN0000000", fuente("mono", 22), TENUE)
    return img


def ingresos():
    """Carta de trabajo, A4 a 150 dpi."""
    img = Image.new("RGB", (1240, 1400), (252, 252, 250))
    d = ImageDraw.Draw(img)

    texto(d, (110, 110), "AGROSERVICIOS DEL ISTMO, S.A.", fuente("serif", 40))
    texto(d, (110, 164), "Via Interamericana, Sona, Provincia de Veraguas", fuente("sans", 21), TENUE)
    texto(d, (110, 194), "RUC 000000-0-000000 DV 00  ·  Tel. 000-0000", fuente("sans", 21), TENUE)
    d.line([110, 240, 1130, 240], fill=(120, 125, 132), width=3)
    texto(d, (110, 254), AVISO, fuente("sans", 16), TENUE)

    texto(d, (110, 330), "Sona, 28 de agosto de 2026", fuente("serif", 25))
    texto(d, (110, 400), "A QUIEN CORRESPONDA:", fuente("serif", 27))

    parrafo = [
        "Por medio de la presente hacemos constar que la senora MARIELA DEL",
        "CARMEN QUIROS BATISTA, con cedula de identidad personal numero",
        "8-912-2044, labora en esta empresa desde el 4 de febrero de 2021, en",
        "el cargo de OPERARIA DE EMPAQUE, bajo contrato por tiempo indefinido.",
        "",
        "Su salario mensual es de QUINIENTOS VEINTE BALBOAS CON 00/100",
        "(B/. 520.00), pagaderos en dos quincenas.",
        "",
        "Se expide la presente a solicitud de la interesada para los fines que",
        "estime convenientes.",
    ]
    y = 470
    for ln in parrafo:
        texto(d, (110, y), ln, fuente("serif", 25))
        y += 46

    texto(d, (110, 1010), "Atentamente,", fuente("serif", 25))
    d.line([110, 1160, 560, 1160], fill=TINTA, width=2)
    texto(d, (110, 1176), "Depto. de Recursos Humanos", fuente("sans", 22))
    texto(d, (110, 1208), "Agroservicios del Istmo, S.A.", fuente("sans", 22), TENUE)

    # Sello: rectangulo, no un sello oficial de nada.
    d.rectangle([700, 1080, 1090, 1240], outline=(140, 60, 60), width=4)
    texto(d, (726, 1116), "DOCUMENTO DE PRUEBA", fuente("sans_bold", 25), (140, 60, 60))
    texto(d, (726, 1156), "SIN VALOR LEGAL", fuente("sans", 22), (140, 60, 60))
    return img.crop((0, 0, 1240, 1320))


MOVIMIENTOS = [
    ("02-JUN", "ABONO SALARIO QUINCENA", "+260.00", "412.10"),
    ("07-JUN", "SUPERMERCADO EL FUERTE", "-84.30", "327.80"),
    ("15-JUN", "PAGO LUZ", "-31.20", "296.60"),
    ("17-JUN", "ABONO SALARIO QUINCENA", "+260.00", "556.60"),
    ("21-JUN", "RETIRO CAJERO SONA", "-120.00", "436.60"),
    ("02-JUL", "ABONO SALARIO QUINCENA", "+260.00", "696.60"),
    ("09-JUL", "FARMACIA SAN JOSE", "-46.75", "649.85"),
    ("14-JUL", "TRANSPORTE Y VARIOS", "-90.00", "559.85"),
    ("17-JUL", "ABONO SALARIO QUINCENA", "+260.00", "819.85"),
    ("23-JUL", "RETIRO CAJERO SONA", "-300.00", "519.85"),
    ("02-AGO", "ABONO SALARIO QUINCENA", "+260.00", "779.85"),
    ("11-AGO", "SUPERMERCADO EL FUERTE", "-102.40", "677.45"),
    ("18-AGO", "ABONO SALARIO QUINCENA", "+260.00", "937.45"),
    ("26-AGO", "PAGO ESCUELA", "-180.00", "757.45"),
    ("31-AGO", "RETIRO CAJERO SONA", "-500.00", "257.45"),
]

# El promedio se calcula, no se escribe. Un extracto donde el promedio no cuadra
# con sus propios saldos es justo lo que un jurado revisa, y el nodo lo usa para
# bajar la tasa de 12.5% a 9.5%: el numero tiene que ser cierto.
SALDO_PROMEDIO = round(sum(float(m[3]) for m in MOVIMIENTOS) / len(MOVIMIENTOS), 2)

# Informe de lab para la via B (OCR + MedPsy + LoRA). Nombres y unidades como
# en mobile/src/core/marcadores.ts. Valores elegidos: GLU alta dispara hallazgo
# en la demo; el resto mezcla dentro/fuera de rango para ejercitar clasificar().
EXAMEN_LECTURAS = [
    ("GLU", "glicemia en ayunas", 168, "mg/dL"),
    ("HB", "hemoglobina", 13.2, "g/dL"),
    ("PLQ", "plaquetas", 245, "x10^3/µL"),
    ("CREA", "creatinina", 0.9, "mg/dL"),
    ("COL", "colesterol total", 218, "mg/dL"),
    ("HTO", "hematocrito", 40, "%"),
    ("TSH", "TSH", 2.1, "µUI/mL"),
]
EXAMEN_FECHA = "2026-09-08"
EXAMEN_LAB = "Laboratorio Clinico San Marcos"
EXAMEN_PACIENTE = "MARIELA DEL CARMEN QUIROS BATISTA"
EXAMEN_CEDULA = "8-912-2044"


def extracto():
    """Extracto bancario. La altura se recorta al contenido."""
    img = Image.new("RGB", (1240, 1400), (253, 253, 251))
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 1239, 130], fill=(232, 236, 240))
    texto(d, (110, 34), "BANCO ISTMENO DE AHORROS", fuente("sans_bold", 36))
    texto(d, (110, 84), "ESTADO DE CUENTA DE AHORROS  ·  " + AVISO, fuente("sans", 17), TENUE)

    cab = [
        ("Cliente", "MARIELA DEL CARMEN QUIROS BATISTA"),
        ("Cuenta", "04-2200-118745"),
        ("Periodo", "01-JUN-2026 al 31-AGO-2026  (3 meses)"),
        ("Saldo promedio del periodo", f"B/. {SALDO_PROMEDIO:.2f}"),
    ]
    y = 178
    for k, v in cab:
        texto(d, (110, y), k, fuente("sans", 20), TENUE)
        texto(d, (470, y), v, fuente("sans_bold", 22))
        y += 42

    y += 26
    d.line([110, y, 1130, y], fill=(120, 125, 132), width=2)
    y += 14
    for x, t in ((110, "FECHA"), (300, "DESCRIPCION"), (830, "MONTO"), (990, "SALDO")):
        texto(d, (x, y), t, fuente("sans_bold", 19), TENUE)
    y += 34
    d.line([110, y, 1130, y], fill=(190, 194, 200), width=1)
    y += 12

    fm = fuente("mono", 20)
    for f_, desc, monto, saldo in MOVIMIENTOS:
        texto(d, (110, y), f_, fm)
        texto(d, (300, y), desc, fm)
        texto(d, (830, y), monto, fm, (150, 60, 60) if monto.startswith("-") else (40, 110, 70))
        texto(d, (990, y), saldo, fm)
        y += 34

    y += 18
    d.line([110, y, 1130, y], fill=(120, 125, 132), width=2)
    texto(d, (830, y + 16), "SALDO FINAL", fuente("sans_bold", 20), TENUE)
    texto(d, (990, y + 16), MOVIMIENTOS[-1][3], fuente("mono_bold", 22))
    return img.crop((0, 0, 1240, y + 86))


def examen():
    """Informe de laboratorio A4. Sin rangos ni 'alto/bajo': eso lo decide clasificar()."""
    img = Image.new("RGB", (1240, 1100), (252, 252, 250))
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 1239, 120], fill=(226, 232, 228))
    texto(d, (110, 28), EXAMEN_LAB.upper(), fuente("sans_bold", 34))
    texto(d, (110, 74), "INFORME DE RESULTADOS  ·  " + AVISO, fuente("sans", 17), TENUE)

    cab = [
        ("Paciente", EXAMEN_PACIENTE),
        ("Cedula", EXAMEN_CEDULA),
        ("Fecha", EXAMEN_FECHA),
        ("Solicitud", "Perfil basico - muestra en ayunas"),
    ]
    y = 160
    for k, v in cab:
        texto(d, (110, y), k, fuente("sans", 20), TENUE)
        texto(d, (320, y), v, fuente("sans_bold", 22))
        y += 40

    y += 20
    d.line([110, y, 1130, y], fill=(120, 125, 132), width=2)
    y += 16
    for x, t in ((110, "PRUEBA"), (620, "RESULTADO"), (900, "UNIDAD")):
        texto(d, (x, y), t, fuente("sans_bold", 20), TENUE)
    y += 36
    d.line([110, y, 1130, y], fill=(190, 194, 200), width=1)
    y += 18

    for _codigo, nombre, valor, unidad in EXAMEN_LECTURAS:
        texto(d, (110, y), nombre, fuente("sans", 24))
        if isinstance(valor, float) and not valor.is_integer():
            num = f"{valor:.1f}"
        else:
            num = str(int(valor) if isinstance(valor, float) and valor.is_integer() else valor)
        texto(d, (620, y), num, fuente("mono_bold", 26))
        texto(d, (900, y), unidad, fuente("mono", 22), TENUE)
        y += 48

    y += 24
    d.line([110, y, 1130, y], fill=(120, 125, 132), width=2)
    texto(d, (110, y + 20), "Documento de prueba. Sin valor clinico ni legal.",
          fuente("sans", 18), TENUE)
    texto(d, (110, y + 50), "Los rangos de referencia no se imprimen: los aplica la app.",
          fuente("sans", 18), TENUE)
    return img.crop((0, 0, 1240, y + 100))


# ------------------------------------------------------------------- ruido

def desgastar(img, rng, fuerte):
    """Lo que le pasa a un papel fotografiado con un telefono en la mano."""
    ang = rng.uniform(-2.6, 2.6) if fuerte else rng.uniform(-0.9, 0.9)
    img = img.rotate(ang, resample=Image.BICUBIC, expand=True, fillcolor=(238, 238, 234))

    img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.9, 1.5) if fuerte else rng.uniform(0.3, 0.6)))

    # Sombra diagonal: la mano tapando la luz.
    an, al = img.size
    sombra = Image.new("L", (an, al))
    ds = ImageDraw.Draw(sombra)
    for i in range(al):
        ds.line([(0, i), (an, i)], fill=int(26 * (i / al) ** 1.5) if fuerte else int(12 * (i / al)))
    img = Image.composite(Image.new("RGB", (an, al), (0, 0, 0)), img, sombra.point(lambda v: v * 2))

    # Grano del sensor.
    amp = 16 if fuerte else 7
    px = img.load()
    for _ in range((an * al) // (5 if fuerte else 13)):
        x, y = rng.randrange(an), rng.randrange(al)
        r, g, b = px[x, y]
        n = rng.randint(-amp, amp)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

    return img


def guardar(img, nombre, rng, fuerte):
    ruta = SALIDA / nombre
    desgastar(img, rng, fuerte).save(ruta, "JPEG", quality=38 if fuerte else 72)
    return ruta


# -------------------------------------------------------------------- main

def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    docs = {
        "cedula": cedula(),
        "ingresos": ingresos(),
        "extracto": extracto(),
        "examen": examen(),
    }

    generados = []
    for nombre, img in docs.items():
        for nivel, fuerte in (("nitido", False), ("dificil", True)):
            rng = random.Random(f"{SEMILLA}-{nombre}-{nivel}")
            ruta = guardar(img.copy(), f"{nombre}-{nivel}.jpg", rng, fuerte)
            kb = ruta.stat().st_size / 1024
            generados.append((ruta.name, kb))
            print(f"  {ruta.name:24s} {kb:7.1f} KB")

    # La verdad de referencia. Sin esto las imagenes son decoracion: con esto
    # la extraccion se puede puntuar campo por campo, como el spike del LoRA.
    esperado = {
        "_nota": "Datos ficticios. Verdad de referencia para puntuar la extraccion.",
        "cedula": {
            "numero": "8-912-2044",
            "nombre": "MARIELA DEL CARMEN QUIROS BATISTA",
            "fecha_nacimiento": "1979-03-14",
            "fecha_expiracion": "2029-11-30",
        },
        "ingresos": {
            "empleador_o_actividad": "Agroservicios del Istmo, S.A.",
            "ingreso_mensual_usd": 520,
            "tipo": "asalariado",
            "fecha_documento": "2026-08-28",
        },
        "extracto": {
            "banco": "Banco Istmeno de Ahorros",
            "saldo_promedio_usd": SALDO_PROMEDIO,
            "meses_cubiertos": 3,
        },
        "examen": {
            "laboratorio": EXAMEN_LAB,
            "fecha": EXAMEN_FECHA,
            "paciente": EXAMEN_PACIENTE,
            "lecturas": [
                {
                    "codigo": c,
                    "nombre": n,
                    "valor": v,
                    "unidad": u,
                }
                for c, n, v, u in EXAMEN_LECTURAS
            ],
        },
    }
    (SALIDA / "esperado.json").write_text(
        json.dumps(esperado, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n  esperado.json           verdad de referencia (cedula, ingresos, extracto, examen)")
    print(f"  {len(generados)} imagenes en data/documentos/")


if __name__ == "__main__":
    main()
