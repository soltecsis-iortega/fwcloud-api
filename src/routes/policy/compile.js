/*
    Copyright 2021 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
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


/**
 * Module to routing COMPILE requests
 * <br>BASE ROUTE CALL: <b>/policy/compile</b>
 *
 * @module Compile
 *
 * @requires express
 * @requires Policy_rModel
 *
 */


/**
 * Class to manage Compile Policy
 *
 * @class CompileRouter
 */


/**
 * Property  to manage express
 *
 * @property express
 * @type express
 */
var express = require('express');
/**
 * Property  to manage  route
 *
 * @property router
 * @type express.Router
 */
var router = express.Router();



const config = require('../../config/config');
import { PolicyScript } from '../../compiler/policy/PolicyScript';
import { PolicyCompiler } from '../../compiler/policy/PolicyCompiler';
import { Channel } from '../../sockets/channels/channel';
import { ProgressErrorPayload } from '../../sockets/messages/socket-message';
import { app, logger } from '../../fonaments/abstract-application';
import { PolicyRule } from '../../models/policy/PolicyRule';
import { PolicyRuleService } from '../../policy-rule/policy-rule.service';


/*----------------------------------------------------------------------------------------------------------------------*/
/* Compile a firewall rule. */
/*----------------------------------------------------------------------------------------------------------------------*/
router.put('/rule', async (req, res) => {
	try {
		//console.time(`Rule compile (ID: ${req.body.rule})`);
		const rulesData = await PolicyRule.getPolicyData('compiler', req.dbCon, req.body.fwcloud, req.body.firewall, req.body.type, req.body.rules, null);
		const rulesCompiled = await PolicyCompiler.compile(req.body.compiler, rulesData);
		//console.timeEnd(`Rule compile (ID: ${req.body.rule})`);

		if (rulesCompiled.length === 0)
			throw new Error('It was not possible to compile the rule');

		res.status(200).json(rulesCompiled);
	} catch(error) {
		logger().error('Error compiling firewall rule: ' + JSON.stringify(error));
		res.status(400).json(error);
	}
});
/*----------------------------------------------------------------------------------------------------------------------*/

/*----------------------------------------------------------------------------------------------------------------------*/
/* Compile a firewall. */
/*----------------------------------------------------------------------------------------------------------------------*/
router.put('/', async (req, res) => {
	const channel = await Channel.fromRequest(req);

	try {
		const policyRuleService = await app().getService(PolicyRuleService.name);
		await policyRuleService.compile(req.body.fwcloud, req.body.firewall, channel);
		res.status(204).end();
	} catch(error) {
		console.log(error)
		if (channel) channel.emit('message', new ProgressErrorPayload('end', true, `ERROR: ${error}`));
		logger().error('Error compiling firewall: ' + JSON.stringify(error));
		res.status(400).json(error);		
	}		
});
/*----------------------------------------------------------------------------------------------------------------------*/

module.exports = router;

