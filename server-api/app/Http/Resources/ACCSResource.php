<?php

namespace Kinderm8\Http\Resources;
use Log;

use Illuminate\Http\Resources\Json\JsonResource;

class ACCSResource extends JsonResource
{

    private $params;

    /**
     * Create a new resource instance.
     *
     * @param  mixed  $resource
     * @return void
     */
    public function __construct($resource, $params = [])
    {

        // Ensure you call the parent constructor
        parent::__construct($resource);

        $this->resource = $resource;

        $this->params = $params;
    }

    public function toArray($request)
    {
        $RRDisplay = array();

        if (array_key_exists('RiskReasons', $this->certificate_or_determination_api_data)) {

            foreach($this->certificate_or_determination_api_data['RiskReasons'] as $riskReason){
                array_push($RRDisplay,$riskReason['reason']);
            }
            
        }

        $extension_reasons = array_key_exists('ExtensionReasons', $this->certificate_or_determination_api_data) ? 
            array_map(function($value) {
                return $value['extensionReason'];
            }, $this->certificate_or_determination_api_data['ExtensionReasons']) : [];

        $childNoLongerAtRisk = false;

        if($this->getChildNoLongerAtRisk)
            $childNoLongerAtRisk = true;

        $prop = [
            'id' => $this->id,
            'certificate_or_determination_id' => $this->certificate_or_determination_id,
            'child_profile_id' => $this->child_profile_id,
            'type' => $this->type,
            'certificate_or_determination_api_data' => $this->certificate_or_determination_api_data,
            'state_territory_data' => $this->state_territory_data,
            'is_synced' => $this->is_synced,
            'draft' => $this->draft,
            'syncerror' => $this->syncerror,
            'dhscorrelationid' => $this->dhscorrelationid,
            'riskReasons' => $RRDisplay,
            'childNoLonerAtRisk' => $childNoLongerAtRisk,
            'child_no_longer_at_risk_data' => $this->getChildNoLongerAtRisk,
            'extensionReasons' => $extension_reasons
        ];
        return $prop;
    }
}
