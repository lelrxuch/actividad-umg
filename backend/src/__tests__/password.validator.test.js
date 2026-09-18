import { describe, it, expect } from 'vitest';
import {
  esContrasenaValida,
  validarContrasena,
  MENSAJE_CONTRASENA_INVALIDA,
} from '../validators/password.validator.js';

describe('password.validator — política de fuerza (SCRUM-29)', () => {
  describe('esContrasenaValida', () => {
    it.each([
      ['Passwor1', 'mínimo exacto de 8 caracteres, con mayúscula y número'],
      ['Password1', 'por encima del mínimo'],
      ['Contr@seña123', 'admite símbolos y acentos'],
      ['ABCDEFG1', 'solo mayúsculas más un número'],
    ])('acepta %j: %s', (contrasena) => {
      expect(esContrasenaValida(contrasena)).toBe(true);
    });

    it.each([
      ['Pass1', 'solo tiene 5 caracteres'],
      ['Passwo1', 'solo tiene 7 caracteres, uno menos que el mínimo'],
      ['password1', 'no tiene mayúscula'],
      ['PASSWORD', 'no tiene número'],
      ['Password', 'no tiene número'],
      ['12345678', 'no tiene mayúscula'],
      ['', 'está vacía'],
    ])('rechaza %j porque %s', (contrasena) => {
      expect(esContrasenaValida(contrasena)).toBe(false);
    });

    it.each([[null], [undefined], [12345678], [{}]])(
      'rechaza el valor no textual %j sin lanzar excepción',
      (valor) => {
        expect(esContrasenaValida(valor)).toBe(false);
      }
    );
  });

  describe('validarContrasena', () => {
    it('no lanza nada cuando la contraseña cumple', () => {
      expect(() => validarContrasena('Password1')).not.toThrow();
    });

    it('lanza el mensaje único de la política', () => {
      expect(() => validarContrasena('123')).toThrow(MENSAJE_CONTRASENA_INVALIDA);
    });

    it('marca el error con status 400 para que el controller responda 400 y no 500', () => {
      expect.assertions(1);
      try {
        validarContrasena('123');
      } catch (error) {
        expect(error.status).toBe(400);
      }
    });
  });
});
