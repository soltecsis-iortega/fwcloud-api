/*
    Copyright 2019 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
    https://soltecsis.com
    info@soltecsis.com


    This file is part of FWCloud (https://fwcloud.net).

    FWCloud is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    FWCloud is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/


var schema = {};
module.exports = schema;

const Joi = require('joi');
const sharedSch = require('../shared');
const fwcError = require('../../../utils/error_table');

schema.validate = req => {
	return new Promise(async(resolve, reject) => {
		var schema = Joi.object().keys({ fwcloud: sharedSch.id });

		if (req.method === 'POST') {
			schema = schema.append({
				code: sharedSch.id,
				name: sharedSch.name,
				comment: sharedSch.comment,
				node_id: sharedSch.id
			});
		} else if (req.method === 'PUT') {
			if (req.url === '/ipobj/mark') {
				schema = schema.append({
					mark: sharedSch.mark_id,
					code: sharedSch.id,
					name: sharedSch.name,
					comment: sharedSch.comment
				});
			} else if (req.url === '/ipobj/mark/get' || req.url === '/ipobj/mark/where' ||
				req.url === '/ipobj/mark/del' || req.url === '/ipobj/mark/restricted') {
				schema = schema.append({ mark: sharedSch.id });
			}
		} else return reject(fwcError.BAD_API_CALL);

		try {
			await schema.validateAsync(req.body, sharedSch.joiValidationOptions);
			resolve();
		} catch (error) { return reject(error) }
	});
};