/*!
    Copyright 2023 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
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
import { Request } from 'express';
import { Controller } from '../../../fonaments/http/controller';
import { Validate, ValidateQuery } from "../../../decorators/validate.decorator";
import { DhcpPolicy } from '../../../policies/dhcp.policy';
import { DHCPRule } from '../../../models/system/dhcp/dhcp_r/dhcp_r.model';
import { ResponseBuilder } from '../../../fonaments/http/response-builder';
import { DHCPGroup } from '../../../models/system/dhcp/dhcp_g/dhcp_g.model';
import { Firewall } from '../../../models/firewall/Firewall';
import { FwCloud } from "../../../models/fwcloud/FwCloud";
import { getRepository, SelectQueryBuilder } from 'typeorm';
import { DHCPRuleService, DHCPRulesData, ICreateDHCPRule, IUpdateDHCPRule } from '../../../models/system/dhcp/dhcp_r/dhcp_r.service';
import { DHCPRuleCreateDto } from './dto/create.dto';
import { Offset } from '../../../offset';
import { DHCPRuleCopyDto } from './dto/copy.dto';
import { DHCPRuleUpdateDto } from './dto/update.dto';
import { DhcpRuleBulkUpdateDto } from './dto/bulk-update.dto';
import { HttpException } from '../../../fonaments/exceptions/http/http-exception';
import { DhcpRuleBulkRemoveDto } from './dto/bulk-remove.dto';
import { AvailableDestinations, DHCPRuleItemForCompiler } from '../../../models/system/shared';


export class DhcpController extends Controller {
  protected _dhcpRuleService: DHCPRuleService;
  protected _dhcprule: DHCPRule;
  protected _dhcpgroup: DHCPGroup;
  protected _firewall: Firewall;
  protected _fwCloud: FwCloud;

  public async make(req: Request): Promise<void> {
    this._dhcpRuleService = await this._app.getService<DHCPRuleService>(DHCPRuleService.name);

    if (req.params.dhcp) {
      this._dhcprule = await getRepository(DHCPRule).findOneOrFail(req.params.dhcp);
    }
    if (req.params.dhcpgroup) {
      this._dhcpgroup = await getRepository(DHCPGroup).findOneOrFail(this._dhcprule.group.id);
    }
    this._firewall = await getRepository(Firewall).findOneOrFail(req.params.firewall);
    this._fwCloud = await getRepository(FwCloud).findOneOrFail(req.params.fwcloud);
  }


  @Validate()
  /**
   * Retrieves a list of DHCP configurations.
   * 
   * @param req - The request object.
   * @param res - The response object.
   * @returns A Promise that resolves to a ResponseBuilder object.
   */
  public async index(req: Request): Promise<ResponseBuilder> {
    (await DhcpPolicy.index(this._firewall, req.session.user)).authorize();

    const dhcpG: DHCPRule[] = await this._dhcpRuleService.getDHCPRulesData('compiler', this._fwCloud.id, this._firewall.id);

    return ResponseBuilder.buildResponse().status(200).body(dhcpG);
  }

  @Validate()
  /**
   * Retrieves the grid data for DHCP.
   * 
   * @param req - The request object.
   * @returns A Promise that resolves to a ResponseBuilder object.
   */
  public async grid(req: Request): Promise<ResponseBuilder> {
    if(![1,2].includes(parseInt(req.params.set))){
      return ResponseBuilder.buildResponse().status(400).body({message: 'Invalid set parameter'});
    }

    (await DhcpPolicy.index(this._firewall, req.session.user)).authorize();

    const dst: AvailableDestinations = parseInt(req.params.set) === 1 ? 'regular_grid' : 'fixed_grid';

    const grid: DHCPRule[] = await this._dhcpRuleService.getDHCPRulesData(dst, this._fwCloud.id, this._firewall.id);

    return ResponseBuilder.buildResponse().status(200).body(grid);
  }

  //TODO: Offset is necessary we can create a rule in other position
  @Validate(DHCPRuleCreateDto)
  public async create(req: Request): Promise<ResponseBuilder> {
    (await DhcpPolicy.create(this._firewall, req.session.user)).authorize();

    const data: ICreateDHCPRule = Object.assign(req.inputs.all<DHCPRuleCreateDto>(), this._dhcpgroup ? { group: this._dhcpgroup.id } : null);
    const dhcpRule = await this._dhcpRuleService.store(data);

    return ResponseBuilder.buildResponse().status(201).body(dhcpRule);
  }

  @Validate(DHCPRuleCopyDto)
  public async copy(req: Request): Promise<ResponseBuilder> {
    const ids: number[] = req.inputs.get('rules');
    for (const id of ids) {
      const rule = await getRepository(DHCPRule).findOneOrFail(id);
      (await DhcpPolicy.copy(rule, req.session.user)).authorize();
    }

    const created: DHCPRule[] = await this._dhcpRuleService.copy(ids, req.inputs.get('to'), req.inputs.get<Offset>('offset'));
    return ResponseBuilder.buildResponse().status(201).body(created);
  }

  @Validate(DHCPRuleUpdateDto)
  public async update(req: Request): Promise<ResponseBuilder> {
    (await DhcpPolicy.update(this._dhcprule, req.session.user)).authorize();

    const result: DHCPRule = await this._dhcpRuleService.update(this._dhcprule.id, req.inputs.all<IUpdateDHCPRule>());

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate()
  public async remove(req: Request): Promise<ResponseBuilder> {
    (await DhcpPolicy.delete(this._dhcprule, req.session.user)).authorize();

    await this._dhcpRuleService.remove({
      fwcloudId: this._fwCloud.id,
      firewallId: this._firewall.id,
      id: parseInt(req.params.dhcp),
    });

    return ResponseBuilder.buildResponse().status(200).body(this._dhcprule);
  }

  @Validate()
  /**
   * Retrieves the DHCP rule and returns it as a response.
   * 
   * @param req - The request object.
   * @returns A Promise that resolves to a ResponseBuilder object.
   */
  public async show(req: Request): Promise<ResponseBuilder> {
    (await DhcpPolicy.show(this._dhcprule, req.session.user)).authorize();

    return ResponseBuilder.buildResponse().status(200).body(this._dhcprule);
  }

  @Validate(DHCPRuleCopyDto)
  public async move(req: Request): Promise<ResponseBuilder> {
    (await DhcpPolicy.move(this._firewall, req.session.user)).authorize();

    const rules: DHCPRule[] = await getRepository(DHCPRule).find({
      join: {
        alias: 'rule',
        innerJoin: {
          firewall: 'rule.firewall',
          fwcloud: 'firewall.fwCloud'
        }
      },
      where: (qb: SelectQueryBuilder<DHCPRule>) => {
        qb.whereInIds(req.inputs.get('rules'))
          .andWhere('firewall.id = :firewall', { firewall: this._firewall.id })
          .andWhere('firewall.fwCloudId = :fwcloud', { fwcloud: this._fwCloud.id })
      }
    });

    const result: DHCPRule[] = await this._dhcpRuleService.move(rules.map(item => item.id), req.inputs.get('to'), req.inputs.get<Offset>('offset'));

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate(DhcpRuleBulkUpdateDto)
  public async bulkUpdate(req: Request): Promise<ResponseBuilder> {
    const rules: DHCPRule[] = [];

    const ids: string[] = req.query.rules as string[] || [];

    for (let id of ids) {
      const rule: DHCPRule = await this._dhcpRuleService.findOneInPath({
        fwcloudId: this._fwCloud.id,
        firewallId: this._firewall.id,
        id: parseInt(id),
      });

      (await DhcpPolicy.update(rule, req.session.user)).authorize();

      rules.push(rule);
    }

    if (!rules.length) {
      throw new HttpException(`No rules found`, 400);
    }

    const result: DHCPRule[] = await this._dhcpRuleService.bulkUpdate(rules.map(item => item.id), req.inputs.all<IUpdateDHCPRule>());

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate()
  @ValidateQuery(DhcpRuleBulkRemoveDto)
  public async bulkRemove(req: Request): Promise<ResponseBuilder> {
    const rules: DHCPRule[] = [];

    const ids: number[] = req.query.rules as unknown as number[] || [];

    for (let id of ids) {
      const rule: DHCPRule = await this._dhcpRuleService.findOneInPath({
        fwcloudId: this._fwCloud.id,
        firewallId: this._firewall.id,
        id,
      });

      (await DhcpPolicy.delete(rule, req.session.user)).authorize();

      rules.push(rule);
    }

    if (!rules.length) {
      throw new HttpException(`No rules found to be removed`, 400);
    }

    const result: DHCPRule[] = await this._dhcpRuleService.bulkRemove(rules.map(item => item.id));

    return ResponseBuilder.buildResponse().status(200).body(result);
  }
}
