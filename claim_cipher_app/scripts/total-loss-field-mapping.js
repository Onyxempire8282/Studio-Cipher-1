/* 🚗 TOTAL LOSS FORMS - Field Mapping Configuration */
/* Maps extracted CCC data to BCIF form fields */

class BCIFFieldMapper {
    constructor() {
        this.init();
    }

    init() {
        // Required field mappings from CCC extraction to BCIF form
        this.requiredFields = {
            // Basic Information
            'officeId': 'Office ID Number',
            'company': 'Company',
            'claimNumber': 'Claim Number',
            'policyNumber': 'Policy Number',
            'vin': 'VIN',
            
            // Vehicle Information
            'year': 'Year',
            'make': 'Make',
            'model': 'Model',
            'trim': 'Trim',
            'cylinders': 'Cylinders',
            'displacement': 'Displacement',
            
            // People Information
            'adjusterFirstName': 'Adjuster First Name',
            'adjusterLastName': 'Adjuster Last Name',
            'adjusterEmail': 'Adjuster Email',
            'adjusterContact': 'Adjuster Contact Number',
            'insuredFirstName': 'Insured First Name',
            'insuredLastName': 'Insured Last Name',
            'ownerFirstName': 'Owner First Name',
            'ownerLastName': 'Owner Last Name',
            
            // Loss Information
            'lossZipCode': 'Loss ZIP Code',
            'lossState': 'Loss State',
            'lossDate': 'Date of loss (mm/dd/yyyy)',
            'odometer': 'Odometer (mi)'
        };

        // Checkbox field mappings for vehicle options
        this.checkboxFields = {
            // Body Style Options
            bodyStyle: {
                '2dr': '2DR',
                '4dr': '4DR',
                'hatchback': 'Hatchback',
                'convertible': 'Convertible',
                'wagon': 'Wagon',
                'pickup': 'Pickup',
                'van': 'Van',
                'utility': 'Utility'
            },

            // Transmission Options
            transmission: {
                'automatic': 'Automatic',
                'overdrive': 'Overdrive',
                's6': 'S6',
                's5': 'S5',
                's4': 'S4',
                's3': 'S3',
                '4w': '4W'
            },

            // Power Options
            powerOptions: {
                'power_steering': 'PS',
                'power_brakes': 'PB',
                'power_windows': 'PW',
                'power_locks': 'PL',
                'power_mirrors': 'PM',
                'power_driver_seat': 'SP',
                'power_passenger_seat': 'PC',
                'power_trunk': 'PT',
                'power_pedals': 'PP',
                'power_sliding_door': 'PD',
                'dual_power_sliding_doors': 'DP'
            },

            // Décor/Convenience
            convenience: {
                'air_conditioning': 'AC',
                'climate_control': 'CL',
                'dual_air_conditioning': 'DA',
                'tilt_wheel': 'TW',
                'cruise_control': 'CC',
                'intermittent_wipers': 'IW',
                'console_storage': 'CN',
                'overhead_console': 'CO',
                'memory_package': 'MM',
                'navigation_system': 'NV',
                'entertainment_center': 'EC',
                'dual_entertainment_center': 'DU',
                'telescopic_wheel': 'TL',
                'heated_steering_wheel': 'HW',
                'message_center': 'MC',
                'home_link': 'GD',
                'rear_defogger': 'RD',
                'remote_starter': 'RJ',
                'wood_interior_trim': 'WT',
                'keyless_entry': 'KE',
                'rear_power_sunshade': 'SZ'
            },

            // Seating Options
            seating: {
                'cloth_seats': 'CS',
                'bucket_seats': 'BS',
                'reclining_seats': 'RL',
                'leather_seats': 'LS',
                'heated_seats': 'SH',
                'rear_heated_seats': 'RH',
                'ventilated_seats': 'VB',
                'third_row_seat': '3S',
                'power_third_seat': '3P',
                'retractable_seats': 'R3',
                '12_passenger': '2P',
                '15_passenger': '5P',
                'captain_chairs_2': 'B2',
                'captain_chairs_4': 'B4',
                'captain_chairs_6': 'B6'
            },

            // Radio Options
            radio: {
                'am_radio': 'AM',
                'fm_radio': 'FM',
                'stereo': 'ST',
                'search_seek': 'SE',
                'cd_player': 'CD',
                'cassette': 'CA',
                'steering_wheel_controls': 'TQ',
                'auxiliary_audio': 'M3',
                'premium_radio': 'UR',
                'cd_changer': 'SK',
                'satellite_radio': 'XM',
                'equalizer': 'EQ'
            },

            // Wheels
            wheels: {
                'styled_steel_wheels': 'SY',
                'full_wheel_covers': 'FC',
                'clad_wheels': 'CY',
                'aluminum_alloy_wheels': 'AW',
                'chrome_wheels': 'CJ',
                '20_inch_wheels': 'W2',
                'wire_wheels': 'WW',
                'wire_wheel_covers': 'WC',
                'locking_wheels': 'KW'
            },

            // Roof Options
            roof: {
                'electric_glass_roof': 'EG',
                'electric_steel_roof': 'ES',
                'skyview_roof': 'OR',
                'dual_power_sunroof': 'SD',
                'manual_steel_roof': 'MS',
                'manual_glass_roof': 'MG',
                'flip_roof': 'FR',
                't_top': 'TT',
                'power_convertible_roof': 'VP',
                'detachable_roof': 'RM',
                'vinyl_covered_roof': 'VR',
                'hard_top': 'HT'
            },

            // Safety/Brakes
            safety: {
                'drivers_airbag': 'AG',
                'passenger_airbag': 'RG',
                'front_side_airbags': 'XG',
                'rear_side_airbags': 'ZG',
                'head_curtain_airbags': 'DG',
                '4wheel_disc_brakes': 'DB',
                'antilock_brakes_4': 'AB',
                'antilock_brakes_2': 'A2',
                'traction_control': 'TX',
                'stability_control': 'T1',
                'positraction': 'PO',
                'communications_system': 'C2',
                'parking_sensors': 'PJ',
                'backup_camera': 'PX',
                'surround_view_camera': 'PZ',
                'alarm': 'TD',
                'hands_free_device': 'HF',
                'xenon_led_headlamps': 'XE',
                'heads_up_display': 'HU',
                'intelligent_cruise': 'IC',
                'blind_spot_detection': 'DV',
                'lane_departure_warning': 'LN',
                'night_vision': 'VZ',
                'roll_bar': 'RB'
            },

            // Exterior/Paint/Glass
            exterior: {
                'dual_mirrors': 'DM',
                'heated_mirrors': 'HM',
                'body_side_moldings': 'BN',
                'tinted_glass': 'TG',
                'aftermarket_tint': 'AF',
                'privacy_glass': 'DT',
                'rear_window_wiper': 'WP',
                'fog_lamps': 'FL',
                'luggage_roof_rack': 'RR',
                'rear_spoiler': 'SL',
                'headlamp_washers': 'HV',
                'signal_integrated_mirrors': 'MX',
                'wood_grain': 'WG',
                'clear_coat_paint': 'IP',
                'metallic_paint': 'MP',
                'two_tone_paint': '2T',
                'three_stage_paint': 'HP'
            },

            // Other Options
            other: {
                'rear_step_bumper': 'SB',
                'trailer_hitch': 'TH',
                'trailering_package': 'TP',
                'rear_sliding_window': 'SW',
                'power_rear_window': 'PG',
                'running_boards': 'BD',
                'power_running_boards': 'UP',
                'bed_liner': 'BL',
                'spray_bed_liner': 'BY',
                'soft_tonneau_cover': 'TN',
                'hard_tonneau_cover': 'TZ',
                'deluxe_truck_cap': 'CP',
                'bed_rails': 'AR',
                'grill_guard': 'GG',
                'tool_box': 'TB',
                'dual_rear_wheels': 'WD',
                'auxiliary_fuel_tank': 'XT',
                'california_emissions': 'EM',
                'stone_guard': 'SG',
                'winch': 'WI'
            },

            // Loss Type Options
            lossType: {
                'collision': 'Collision',
                'theft': 'Theft'
            },

            // Loss Category Options
            lossCategory: {
                'other': 'Other',
                'liability': 'Liability',
                'comprehensive': 'Comprehensive',
                'collision': 'Collision'
            },

            // Fuel Type
            fuelType: {
                'gas': 'Gas',
                'diesel': 'Diesel',
                'other': 'Other'
            },

            // Yes/No Options
            yesNoFields: {
                'leased_vehicle': ['Leased Vehicle Yes', 'Leased Vehicle No'],
                'third_party_claim': ['3rd Party Claim Yes', '3rd Party Claim No']
            }
        };

        // Condition rating mappings (0-3 scale)
        this.conditionFields = {
            'engine_condition': 'Engine',
            'transmission_condition': 'Transmission',
            'paint_condition': 'Paint',
            'front_tires_condition': 'Front Tires',
            'rear_tires_condition': 'Rear Tires',
            'body_glass_condition': 'Body/Glass',
            'interior_condition': 'Interior'
        };

        // Package options
        this.packageFields = {
            'package_1': 'Package 1',
            'package_2': 'Package 2',
            'package_3': 'Package 3'
        };
    }

    /**
     * Maps extracted CCC data to BCIF form structure
     * @param {Object} extractedData - Data extracted from CCC PDF
     * @returns {Object} - Mapped data ready for BCIF form filling
     */
    mapToBCIF(extractedData) {
        const bcifData = {
            textFields: {},
            checkboxFields: {},
            conditionRatings: {},
            packages: {}
        };

        // Map text fields
        for (const [cccField, bcifField] of Object.entries(this.requiredFields)) {
            if (extractedData[cccField]) {
                bcifData.textFields[bcifField] = extractedData[cccField];
            }
        }

        // Map checkbox fields based on vehicle options
        if (extractedData.vehicleOptions) {
            this.mapVehicleOptions(extractedData.vehicleOptions, bcifData.checkboxFields);
        }

        // Map condition ratings if available
        if (extractedData.conditions) {
            for (const [cccField, bcifField] of Object.entries(this.conditionFields)) {
                if (extractedData.conditions[cccField] !== undefined) {
                    bcifData.conditionRatings[bcifField] = extractedData.conditions[cccField];
                }
            }
        }

        // Map package information
        if (extractedData.packages) {
            for (const [cccField, bcifField] of Object.entries(this.packageFields)) {
                if (extractedData.packages[cccField]) {
                    bcifData.packages[bcifField] = true;
                }
            }
        }

        return bcifData;
    }

    /**
     * Maps vehicle options to checkbox fields
     * @param {Array|Object} vehicleOptions - Vehicle options from CCC extraction
     * @param {Object} checkboxFields - Target checkbox fields object
     */
    mapVehicleOptions(vehicleOptions, checkboxFields) {
        // Handle both array and object formats
        const optionsArray = Array.isArray(vehicleOptions) ? vehicleOptions : Object.keys(vehicleOptions);

        for (const option of optionsArray) {
            const normalizedOption = this.normalizeOptionName(option);
            
            // Search through all checkbox categories
            for (const [category, mappings] of Object.entries(this.checkboxFields)) {
                if (mappings[normalizedOption]) {
                    checkboxFields[mappings[normalizedOption]] = true;
                    break;
                }
            }
        }
    }

    /**
     * Normalizes option names for consistent mapping
     * @param {String} optionName - Raw option name from extraction
     * @returns {String} - Normalized option name
     */
    normalizeOptionName(optionName) {
        return optionName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Validates mapped data for required fields
     * @param {Object} bcifData - Mapped BCIF data
     * @returns {Object} - Validation results
     */
    validateMappedData(bcifData) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check required fields (reduced to most critical ones)
        const requiredBCIFFields = [
            'Claim Number',
            'Insured Last Name'
        ];

        for (const field of requiredBCIFFields) {
            if (!bcifData.textFields[field]) {
                validation.valid = false;
                validation.errors.push(`Required field missing: ${field}`);
            }
        }

        // Check for vehicle information
        const vehicleFields = ['Year', 'Make', 'Model'];
        for (const field of vehicleFields) {
            if (!bcifData.textFields[field]) {
                validation.warnings.push(`Vehicle field missing: ${field}`);
            }
        }

        return validation;
    }

    /**
     * Gets all available field mappings for documentation
     * @returns {Object} - Complete field mapping structure
     */
    getAllMappings() {
        return {
            textFields: this.requiredFields,
            checkboxFields: this.checkboxFields,
            conditionFields: this.conditionFields,
            packageFields: this.packageFields
        };
    }
}

// Export for use in other modules
window.BCIFFieldMapper = BCIFFieldMapper;